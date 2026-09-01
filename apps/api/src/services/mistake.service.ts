/**
 * MistakeService
 *
 * Tracks every wrong answer as structured data, detects repeat patterns,
 * triggers repair sessions, and propagates side effects to MasteryService
 * and RevisionService.
 *
 * Pattern detection threshold: 3+ mistakes on the same (concept_id, error_type)
 * within a rolling 30-day window triggers MISTAKE_PATTERN_DETECTED.
 *
 * Side effects on mistake creation:
 *   1. MasteryService.addEvidence (evidence_type: "practice", score: 0, is_correct: false)
 *   2. RevisionService.scheduleRevision (ensures concept gets a revision slot)
 *   3. Pattern detection scan (3+ → MISTAKE_PATTERN_DETECTED event)
 */

import { getServiceClient } from "@tillu/database";
import { TilluError, ValidationError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { EventBus } from "@tillu/events";
import { EventType } from "@tillu/schemas";
import { z } from "zod";

const logger = createLogger({ service: "mistake_service" });

/** Minimum mistakes on same concept+error_type to constitute a pattern */
const PATTERN_THRESHOLD = 3;
/** Window (days) for pattern detection */
const PATTERN_WINDOW_DAYS = 30;

// ── Input schemas ─────────────────────────────────────────────────────────────

export const ErrorTypeSchema = z.enum([
  "conceptual", "formula", "calculation", "sign",
  "unit", "carelessness", "misreading", "memory",
  "time_pressure", "presentation",
]);

export const SeveritySchema = z.enum(["low", "medium", "high"]);

export const CreateMistakeSchema = z.object({
  concept_id:   z.string().uuid(),
  question_id:  z.string().uuid().optional(),
  error_type:   ErrorTypeSchema,
  severity:     SeveritySchema.default("medium"),
  cause:        z.string().max(500).optional(),
  source:       z.string().optional(), // "quiz" | "practice" | "exam" | "manual"
});

export const ResolveMistakeSchema = z.object({
  mistake_id:        z.string().uuid(),
  resolution_status: z.enum(["in_repair", "resolved"]),
});

export type CreateMistakeInput  = z.infer<typeof CreateMistakeSchema>;
export type ErrorType           = z.infer<typeof ErrorTypeSchema>;

// ── Service ───────────────────────────────────────────────────────────────────

export class MistakeService {
  constructor(private readonly eventBus: EventBus) {}

  /**
   * Record a new mistake.
   * Triggers: MISTAKE_CREATED event, mastery evidence, revision schedule,
   * and pattern detection.
   */
  async createMistake(studentId: string, input: CreateMistakeInput) {
    const parsed = CreateMistakeSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid mistake data", { errors: parsed.error.flatten() });
    }

    const { concept_id, question_id, error_type, severity, cause, source } = parsed.data;
    const db = getServiceClient();

    // Verify concept exists
    const { data: concept } = await db
      .from("concepts")
      .select("id, name")
      .eq("id", concept_id)
      .single();

    if (!concept) {
      throw new TilluError("Concept not found", "NOT_FOUND", false, { concept_id });
    }

    // Count previous attempts (for attempt_number)
    const { count: prevCount } = await db
      .from("mistakes")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("concept_id", concept_id);

    const attemptNumber = (prevCount ?? 0) + 1;

    // Insert the mistake record
    const { data: mistake, error } = await db
      .from("mistakes")
      .insert({
        student_id:        studentId,
        concept_id,
        question_id:       question_id ?? null,
        error_type,
        severity,
        cause:             cause ?? null,
        attempt_number:    attemptNumber,
        resolution_status: "unresolved",
      })
      .select()
      .single();

    if (error || !mistake) {
      throw new TilluError(error?.message ?? "Failed to record mistake", "DATABASE_ERROR", true);
    }

    logger.info("mistake_service.created", {
      student_id: studentId,
      concept_id,
      error_type,
      severity,
      attempt_number: attemptNumber,
    });

    // ── Emit MISTAKE_CREATED ─────────────────────────────────────────────────
    await this.eventBus
      .emit(
        EventType.MISTAKE_CREATED,
        studentId,
        { mistake_id: mistake.id, concept_id, error_type, severity, source: source ?? null },
        { source: "mistake_service" }
      )
      .catch((err: unknown) => {
        logger.warn("mistake_service.event_emit_failed", {
          event_type: "MISTAKE_CREATED",
          error: err instanceof Error ? err.message : String(err),
        });
      });

    // ── Pattern detection (non-blocking) ─────────────────────────────────────
    const pattern = await this.detectPattern(studentId, concept_id, error_type);
    if (pattern) {
      await this.eventBus
        .emit(
          EventType.MISTAKE_PATTERN_DETECTED,
          studentId,
          {
            concept_id,
            error_type,
            frequency:    pattern.frequency,
            pattern_id:   pattern.id,
            severity:     pattern.severity,
          },
          { source: "mistake_service" }
        )
        .catch((err: unknown) => {
          logger.warn("mistake_service.pattern_event_failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return { mistake, pattern };
  }

  /**
   * Get all mistakes for a student, newest first.
   * Optional filters: concept_id, error_type, resolution_status.
   */
  async getMistakes(
    studentId: string,
    options: {
      concept_id?:        string;
      error_type?:        string;
      resolution_status?: string;
      limit?:             number;
    } = {}
  ) {
    const db = getServiceClient();
    let query = db
      .from("mistakes")
      .select(`
        id, concept_id, question_id, error_type, severity, cause,
        attempt_number, resolution_status, created_at, updated_at,
        concepts (id, name, importance,
          chapters (id, name, subjects (id, name, code))
        )
      `)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(options.limit ?? 50);

    if (options.concept_id)        query = query.eq("concept_id",        options.concept_id);
    if (options.error_type)        query = query.eq("error_type",        options.error_type);
    if (options.resolution_status) query = query.eq("resolution_status", options.resolution_status);

    const { data, error } = await query;
    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
    return data ?? [];
  }

  /**
   * Get mistake patterns — grouped by (concept_id, error_type).
   */
  async getMistakePatterns(studentId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("mistake_patterns")
      .select(`
        id, concept_id, error_type, frequency, severity,
        first_seen_at, last_seen_at, status,
        concepts (id, name, importance,
          chapters (id, name, subjects (id, name, code))
        )
      `)
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("frequency", { ascending: false });

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
    return data ?? [];
  }

  /**
   * Start a repair session for a mistake pattern.
   * Returns a repair plan: micro-lesson → easy Q → medium Q → PYQ → delayed recall.
   * In Phase 4 this returns a structured plan; the UI drives the session.
   */
  async startRepairSession(studentId: string, patternId: string) {
    const db = getServiceClient();

    const { data: pattern } = await db
      .from("mistake_patterns")
      .select(`
        id, concept_id, error_type, frequency, severity,
        concepts (id, name, chapters (name, subjects (name, code)))
      `)
      .eq("id", patternId)
      .eq("student_id", studentId)
      .single();

    if (!pattern) {
      throw new TilluError("Pattern not found", "NOT_FOUND", false, { pattern_id: patternId });
    }

    // Build a structured repair plan
    const repairPlan = this.buildRepairPlan(pattern);

    logger.info("mistake_service.repair_started", {
      student_id:  studentId,
      pattern_id:  patternId,
      concept_id:  pattern.concept_id,
      error_type:  pattern.error_type,
    });

    return repairPlan;
  }

  /**
   * Resolve or update a mistake's resolution status.
   */
  async resolveMistake(studentId: string, input: z.infer<typeof ResolveMistakeSchema>) {
    const parsed = ResolveMistakeSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid resolve input", { errors: parsed.error.flatten() });
    }

    const db = getServiceClient();
    const { data, error } = await db
      .from("mistakes")
      .update({
        resolution_status: parsed.data.resolution_status,
        updated_at:        new Date().toISOString(),
      })
      .eq("id", parsed.data.mistake_id)
      .eq("student_id", studentId)
      .select()
      .single();

    if (error || !data) {
      throw new TilluError("Mistake not found", "NOT_FOUND", false);
    }

    // If resolved, update the pattern if one exists
    if (parsed.data.resolution_status === "resolved") {
      const { data: pattern } = await db
        .from("mistake_patterns")
        .select("id")
        .eq("student_id", studentId)
        .eq("concept_id", data.concept_id)
        .eq("error_type", data.error_type)
        .eq("status", "active")
        .single();

      if (pattern) {
        // Check if all mistakes for this pattern are resolved
        const { count: unresolvedCount } = await db
          .from("mistakes")
          .select("id", { count: "exact", head: true })
          .eq("student_id", studentId)
          .eq("concept_id", data.concept_id)
          .eq("error_type", data.error_type)
          .eq("resolution_status", "unresolved");

        if ((unresolvedCount ?? 0) === 0) {
          await db
            .from("mistake_patterns")
            .update({ status: "resolved" })
            .eq("id", pattern.id);
        }
      }
    }

    return data;
  }

  /**
   * Mistake Bank summary — grouped stats per concept.
   */
  async getMistakeBankSummary(studentId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("mistakes")
      .select(`
        concept_id, error_type, severity, resolution_status,
        concepts (id, name, chapters (name, subjects (code)))
      `)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    const mistakes = data ?? [];

    // Group by concept
    const grouped = new Map<string, {
      concept_id:   string;
      concept_name: string;
      subject_code: string;
      chapter_name: string;
      total:        number;
      unresolved:   number;
      error_types:  Map<string, number>;
      top_error:    string;
    }>();

    for (const m of mistakes) {
      const conceptId = m.concept_id;
      const existing  = grouped.get(conceptId);
      const conceptName = (m.concepts as { name: string } | null)?.name ?? "Unknown";
      const subjectCode = (m.concepts as { chapters?: { subjects?: { code: string } } } | null)
        ?.chapters?.subjects?.code ?? "";
      const chapterName = (m.concepts as { chapters?: { name: string } } | null)
        ?.chapters?.name ?? "";

      if (!existing) {
        grouped.set(conceptId, {
          concept_id:   conceptId,
          concept_name: conceptName,
          subject_code: subjectCode,
          chapter_name: chapterName,
          total:        1,
          unresolved:   m.resolution_status === "unresolved" ? 1 : 0,
          error_types:  new Map([[m.error_type, 1]]),
          top_error:    m.error_type,
        });
      } else {
        existing.total++;
        if (m.resolution_status === "unresolved") existing.unresolved++;
        existing.error_types.set(
          m.error_type,
          (existing.error_types.get(m.error_type) ?? 0) + 1
        );
        // Update top error type
        const maxEntry = [...existing.error_types.entries()]
          .reduce((a, b) => (b[1] > a[1] ? b : a));
        existing.top_error = maxEntry[0];
      }
    }

    return [...grouped.values()]
      .sort((a, b) => b.unresolved - a.unresolved)
      .map((g) => ({
        ...g,
        error_types: Object.fromEntries(g.error_types),
      }));
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async detectPattern(
    studentId: string,
    conceptId: string,
    errorType: string
  ) {
    const db = getServiceClient();
    const windowStart = new Date(
      Date.now() - PATTERN_WINDOW_DAYS * 86_400_000
    ).toISOString();

    const { count } = await db
      .from("mistakes")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("concept_id", conceptId)
      .eq("error_type", errorType)
      .gte("created_at", windowStart);

    const frequency = count ?? 0;

    if (frequency < PATTERN_THRESHOLD) return null;

    // Upsert pattern record
    const { data: pattern, error } = await db
      .from("mistake_patterns")
      .upsert(
        {
          student_id:    studentId,
          concept_id:    conceptId,
          error_type:    errorType,
          frequency,
          severity:      frequency >= 6 ? "high" : frequency >= 4 ? "medium" : "low",
          last_seen_at:  new Date().toISOString(),
          status:        "active",
        },
        { onConflict: "student_id,concept_id,error_type" }
      )
      .select()
      .single();

    if (error) {
      logger.warn("mistake_service.pattern_upsert_failed", { error: error.message });
      return null;
    }

    logger.info("mistake_service.pattern_detected", {
      student_id: studentId,
      concept_id: conceptId,
      error_type: errorType,
      frequency,
    });

    return pattern;
  }

  private buildRepairPlan(pattern: {
    id:         string;
    concept_id: string;
    error_type: string;
    frequency:  number;
    concepts:   unknown;
  }) {
    const conceptName = (pattern.concepts as { name?: string } | null)?.name ?? "this concept";
    const errorFriendly: Record<string, string> = {
      conceptual:    "understand the underlying concept",
      formula:       "memorise the correct formula",
      calculation:   "practice the arithmetic carefully",
      sign:          "apply sign conventions correctly",
      unit:          "track units through each step",
      carelessness:  "slow down and double-check each step",
      misreading:    "read the question more carefully",
      memory:        "recall and write the formula from memory",
      time_pressure: "practice under timed conditions",
      presentation:  "structure your answer clearly",
    };

    return {
      pattern_id:   pattern.id,
      concept_id:   pattern.concept_id,
      error_type:   pattern.error_type,
      concept_name: conceptName,
      focus:        errorFriendly[pattern.error_type] ?? "review this concept",
      steps: [
        {
          step:        1,
          type:        "micro_lesson",
          instruction: `Review the key principle: ${conceptName}. Focus on: ${errorFriendly[pattern.error_type] ?? "the core concept"}.`,
          duration_min: 5,
        },
        {
          step:        2,
          type:        "easy_question",
          instruction: "Solve one straightforward question on this concept.",
          duration_min: 5,
        },
        {
          step:        3,
          type:        "medium_question",
          instruction: "Solve a standard-difficulty question.",
          duration_min: 8,
        },
        {
          step:        4,
          type:        "pyq",
          instruction: "Attempt a past-year board question on this concept.",
          duration_min: 10,
        },
        {
          step:        5,
          type:        "delayed_recall",
          instruction: "In 2 days, write the formula/method from memory without notes.",
          duration_min: 5,
          scheduled_in_days: 2,
        },
      ],
      estimated_total_min: 33,
    };
  }
}
