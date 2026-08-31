import { getServiceClient } from "@tillu/database";
import { TilluError, ValidationError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { EventBus } from "@tillu/events";
import { EventType } from "@tillu/schemas";
import { z } from "zod";

const logger = createLogger({ service: "study_service" });

// ── Input schemas ─────────────────────────────────────────────────────────────

export const StartSessionSchema = z.object({
  subject_id: z.string().uuid().optional(),
  chapter_id: z.string().uuid().optional(),
  concept_id: z.string().uuid().optional(),
  activity_type: z
    .enum(["lecture", "practice", "revision", "quiz", "exam", "repair"])
    .default("practice"),
  planned_duration_min: z.number().int().min(1).max(480).optional(),
});

export type StartSessionInput = z.infer<typeof StartSessionSchema>;

// ── Service ───────────────────────────────────────────────────────────────────

export class StudyService {
  constructor(private readonly eventBus: EventBus) {}

  /** Start a new study session. Emits SESSION_STARTED. */
  async startSession(studentId: string, input: StartSessionInput) {
    const parsed = StartSessionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid session data", {
        errors: parsed.error.flatten(),
      });
    }

    const db = getServiceClient();

    // Verify subject/chapter/concept belong to each other if provided
    if (parsed.data.chapter_id && parsed.data.subject_id) {
      const { data: chapter } = await db
        .from("chapters")
        .select("id, subject_id")
        .eq("id", parsed.data.chapter_id)
        .single();
      if (!chapter || chapter.subject_id !== parsed.data.subject_id) {
        throw new ValidationError("Chapter does not belong to the given subject");
      }
    }

    const now = new Date().toISOString();
    const { data: session, error } = await db
      .from("study_sessions")
      .insert({
        student_id: studentId,
        subject_id: parsed.data.subject_id ?? null,
        chapter_id: parsed.data.chapter_id ?? null,
        concept_id: parsed.data.concept_id ?? null,
        activity_type: parsed.data.activity_type,
        status: "active",
        planned_duration_min: parsed.data.planned_duration_min ?? null,
        started_at: now,
      })
      .select()
      .single();

    if (error || !session) {
      throw new TilluError(error?.message ?? "Failed to create session", "DATABASE_ERROR", true);
    }

    // Emit event (non-blocking — don't fail the session if event fails)
    await this.eventBus
      .emit(
        EventType.SESSION_STARTED,
        studentId,
        {
          session_id: session.id,
          activity_type: parsed.data.activity_type,
          subject_id: parsed.data.subject_id ?? null,
          chapter_id: parsed.data.chapter_id ?? null,
        },
        { source: "study_service" }
      )
      .catch((err: unknown) => {
        logger.warn("study_service.event_emit_failed", {
          event_type: "SESSION_STARTED",
          session_id: session.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    logger.info("study_service.session_started", {
      session_id: session.id,
      student_id: studentId,
      activity_type: parsed.data.activity_type,
    });

    return session;
  }

  /** Pause an active session */
  async pauseSession(sessionId: string, studentId: string) {
    const session = await this.requireSessionOwner(sessionId, studentId);

    if (session.status !== "active") {
      throw new TilluError(
        `Cannot pause a session with status "${session.status}"`,
        "INVALID_STATE",
        false
      );
    }

    const db = getServiceClient();
    const { data, error } = await db
      .from("study_sessions")
      .update({ status: "paused" })
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !data) {
      throw new TilluError(error?.message ?? "Failed to pause session", "DATABASE_ERROR", true);
    }

    logger.info("study_service.session_paused", { session_id: sessionId });
    return data;
  }

  /** Resume a paused session */
  async resumeSession(sessionId: string, studentId: string) {
    const session = await this.requireSessionOwner(sessionId, studentId);

    if (session.status !== "paused") {
      throw new TilluError(
        `Cannot resume a session with status "${session.status}"`,
        "INVALID_STATE",
        false
      );
    }

    const db = getServiceClient();
    const { data, error } = await db
      .from("study_sessions")
      .update({ status: "active" })
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !data) {
      throw new TilluError(error?.message ?? "Failed to resume session", "DATABASE_ERROR", true);
    }

    logger.info("study_service.session_resumed", { session_id: sessionId });
    return data;
  }

  /** End a session (complete or abandon). Emits SESSION_COMPLETED. */
  async endSession(
    sessionId: string,
    studentId: string,
    outcome: "completed" | "abandoned" = "completed"
  ) {
    const session = await this.requireSessionOwner(sessionId, studentId);

    if (session.status === "completed" || session.status === "abandoned") {
      throw new TilluError(
        `Session is already ${session.status}`,
        "INVALID_STATE",
        false
      );
    }

    const endedAt = new Date();
    const startedAt = new Date(session.started_at);
    const actualDurationMin = Math.round(
      (endedAt.getTime() - startedAt.getTime()) / 60_000
    );

    const db = getServiceClient();
    const { data, error } = await db
      .from("study_sessions")
      .update({
        status: outcome,
        ended_at: endedAt.toISOString(),
        actual_duration_min: actualDurationMin,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !data) {
      throw new TilluError(error?.message ?? "Failed to end session", "DATABASE_ERROR", true);
    }

    // Emit event
    const eventType =
      outcome === "completed" ? EventType.SESSION_COMPLETED : EventType.SESSION_ABANDONED;

    await this.eventBus
      .emit(
        eventType,
        studentId,
        {
          session_id: data.id,
          activity_type: data.activity_type,
          actual_duration_min: actualDurationMin,
          subject_id: data.subject_id,
          chapter_id: data.chapter_id,
        },
        { source: "study_service" }
      )
      .catch((err: unknown) => {
        logger.warn("study_service.event_emit_failed", {
          event_type: eventType,
          session_id: data.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    logger.info("study_service.session_ended", {
      session_id: sessionId,
      student_id: studentId,
      outcome,
      actual_duration_min: actualDurationMin,
    });

    return data;
  }

  /** List recent sessions for a student (last 30, newest first) */
  async listSessions(
    studentId: string,
    options: { limit?: number; status?: string } = {}
  ) {
    const db = getServiceClient();
    let query = db
      .from("study_sessions")
      .select(
        `*, subjects(name, code), chapters(name), concepts(name)`
      )
      .eq("student_id", studentId)
      .order("started_at", { ascending: false })
      .limit(options.limit ?? 30);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;
    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    return data ?? [];
  }

  /** Get a single session by id (must belong to student) */
  async getSession(sessionId: string, studentId: string) {
    return this.requireSessionOwner(sessionId, studentId);
  }

  /** Get today's study summary for a student */
  async getTodaySummary(studentId: string) {
    const db = getServiceClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await db
      .from("study_sessions")
      .select("id, activity_type, status, actual_duration_min, started_at")
      .eq("student_id", studentId)
      .gte("started_at", todayStart.toISOString())
      .order("started_at", { ascending: false });

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    const sessions = data ?? [];
    const totalMinutes = sessions
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + (s.actual_duration_min ?? 0), 0);

    return {
      sessions,
      total_sessions: sessions.length,
      completed_sessions: sessions.filter((s) => s.status === "completed").length,
      total_minutes: totalMinutes,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async requireSessionOwner(sessionId: string, studentId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("student_id", studentId)
      .single();

    if (error || !data) {
      throw new TilluError("Session not found", "NOT_FOUND", false, {
        session_id: sessionId,
        student_id: studentId,
      });
    }

    return data;
  }
}
