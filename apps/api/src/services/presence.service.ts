/**
 * PresenceService
 *
 * Maintains the student's inferred presence state via a state machine.
 * Aggregates signals from multiple sources and computes a confidence score.
 *
 * INV-009: Presence confidence must NEVER equal exactly 1.0.
 * No signal combination can prove the student is physically present.
 * Maximum achievable confidence is 0.95.
 *
 * State machine:
 *   UNKNOWN ──► AVAILABLE  (web session active, local heartbeat, recent interaction)
 *           ──► STUDYING   (active study session)
 *           ──► AWAY       (no interaction for AWAY_THRESHOLD minutes)
 *           ──► SLEEPING   (within configured sleep window)
 *           ──► OFFLINE    (no signals for OFFLINE_THRESHOLD minutes)
 *
 * Valid transitions:
 *   Any state → any state (signals override, not just adjacent transitions)
 *
 * Signals (each contributes a partial confidence increment):
 *   web_session_active  +0.35   (browser tab open and recently interacted)
 *   study_session_open  +0.30   (active study session in DB)
 *   local_agent_ping    +0.25   (local agent heartbeat received recently)
 *   recent_api_call     +0.15   (API call within last 5 minutes)
 *   explicit_status     +0.00   (student manually set status — overrides inference)
 *   lecture_active      +0.25   (lecture playback in progress)
 *
 * Confidence is capped at 0.95 (INV-009).
 */

import { getServiceClient } from "@tillu/database";
import { TilluError, ValidationError, InvariantViolationError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { EventBus } from "@tillu/events";
import { EventType } from "@tillu/schemas";
import { z } from "zod";

const logger = createLogger({ service: "presence_service" });

/** INV-009: Maximum confidence — never 1.0 */
const MAX_CONFIDENCE = 0.95;

/** Minutes of inactivity before transitioning to AWAY */
const AWAY_THRESHOLD_MIN = 15;
/** Minutes of inactivity before transitioning to OFFLINE */
const OFFLINE_THRESHOLD_MIN = 60;

// ── Signal weights ────────────────────────────────────────────────────────────

const SIGNAL_WEIGHTS: Record<string, number> = {
  web_session_active: 0.35,
  study_session_open: 0.30,
  local_agent_ping:   0.25,
  recent_api_call:    0.15,
  lecture_active:     0.25,
};

// ── Input schemas ─────────────────────────────────────────────────────────────

export const PresenceStateSchema = z.enum([
  "UNKNOWN", "AVAILABLE", "STUDYING", "AWAY", "SLEEPING", "OFFLINE",
]);

export const SignalSchema = z.object({
  signal_type: z.enum([
    "web_session_active",
    "study_session_open",
    "local_agent_ping",
    "recent_api_call",
    "lecture_active",
    "study_session_ended",
    "lecture_ended",
    "explicit_away",
  ]),
  metadata: z.record(z.unknown()).optional(),
});

export const OverrideSchema = z.object({
  state: PresenceStateSchema,
  reason: z.string().optional(),
});

export type PresenceState      = z.infer<typeof PresenceStateSchema>;
export type PresenceSignalInput = z.infer<typeof SignalSchema>;

// ── Service ───────────────────────────────────────────────────────────────────

export class PresenceService {
  constructor(private readonly eventBus: EventBus) {}

  /**
   * Get the current presence state for a student.
   * Returns the stored state or UNKNOWN if none exists.
   */
  async getPresence(studentId: string) {
    const db = getServiceClient();
    const { data } = await db
      .from("presence_state")
      .select("*")
      .eq("student_id", studentId)
      .single();

    if (!data) {
      return {
        state:          "UNKNOWN" as PresenceState,
        confidence:     0,
        source_signals: {} as Record<string, unknown>,
        updated_at:     null,
      };
    }

    return data;
  }

  /**
   * Process an incoming presence signal and recompute state.
   * Called by: web middleware (on API call), study service (session open/close),
   * local agent (heartbeat), lecture service (playback start/end).
   */
  async processSignal(studentId: string, input: PresenceSignalInput) {
    const parsed = SignalSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid signal", { errors: parsed.error.flatten() });
    }

    const { signal_type, metadata } = parsed.data;
    const db = getServiceClient();

    // Load current presence state
    const current = await this.getPresence(studentId);
    const prevState = current.state as PresenceState;

    // Load existing signals from stored state
    const existingSignals = (current.source_signals as Record<string, unknown>) ?? {};

    // Update the signal map with the new signal timestamp
    const updatedSignals: Record<string, unknown> = {
      ...existingSignals,
      [signal_type]: {
        received_at: new Date().toISOString(),
        metadata:    metadata ?? {},
      },
    };

    // Handle explicit away signal
    if (signal_type === "explicit_away") {
      return this.updatePresence(studentId, "AWAY", 0.85, updatedSignals, prevState);
    }

    // Compute new state and confidence from all active signals
    const { state: newState, confidence } = await this.computeState(
      studentId,
      signal_type,
      updatedSignals
    );

    return this.updatePresence(studentId, newState, confidence, updatedSignals, prevState);
  }

  /**
   * Explicit student override — student manually sets their status.
   * INV-009 still applies: confidence is capped at 0.95 even for explicit overrides.
   */
  async overridePresence(studentId: string, input: z.infer<typeof OverrideSchema>) {
    const parsed = OverrideSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid override input", { errors: parsed.error.flatten() });
    }

    const current  = await this.getPresence(studentId);
    const prevState = current.state as PresenceState;
    const signals  = {
      ...(current.source_signals as Record<string, unknown>),
      explicit_override: {
        received_at: new Date().toISOString(),
        state:       parsed.data.state,
        reason:      parsed.data.reason ?? null,
      },
    };

    // Confidence for explicit override is 0.90 — student said so but we can't verify
    // they're actually in that state. INV-009: still not 1.0.
    const confidence = PresenceService.capConfidence(0.90);

    return this.updatePresence(studentId, parsed.data.state, confidence, signals, prevState);
  }

  /**
   * Scan for stale presence signals and decay the state.
   * Called by n8n every 5 minutes.
   */
  async decayStalePresence(studentId: string): Promise<void> {
    const presence = await this.getPresence(studentId);
    if (presence.state === "UNKNOWN" || presence.state === "SLEEPING") return;

    if (!presence.updated_at) return;

    const lastUpdate    = new Date(presence.updated_at as string);
    const minutesSince  = (Date.now() - lastUpdate.getTime()) / 60_000;

    if (minutesSince >= OFFLINE_THRESHOLD_MIN) {
      await this.updatePresence(
        studentId, "OFFLINE",
        PresenceService.capConfidence(0.70),
        presence.source_signals as Record<string, unknown>,
        presence.state as PresenceState
      );
    } else if (minutesSince >= AWAY_THRESHOLD_MIN && presence.state === "AVAILABLE") {
      await this.updatePresence(
        studentId, "AWAY",
        PresenceService.capConfidence(0.75),
        presence.source_signals as Record<string, unknown>,
        presence.state as PresenceState
      );
    }
  }

  // ── INV-009 guard ────────────────────────────────────────────────────────────

  /**
   * Cap confidence at MAX_CONFIDENCE (0.95).
   * INV-009: presence inference is NEVER certainty — confidence < 1.0 always.
   */
  static capConfidence(raw: number): number {
    if (raw >= 1.0) {
      throw new InvariantViolationError(
        "INV-009: Presence confidence may not reach 1.0. Inferred presence is never certain.",
        { attempted: raw }
      );
    }
    return Math.min(MAX_CONFIDENCE, Math.max(0, Math.round(raw * 100) / 100));
  }

  /** Assert that a confidence value respects INV-009 (used in tests) */
  static assertConfidenceInvariant(confidence: number): void {
    if (confidence >= 1.0) {
      throw new InvariantViolationError(
        "INV-009: Presence confidence must be < 1.0",
        { confidence }
      );
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async computeState(
    studentId: string,
    latestSignal: string,
    signals: Record<string, unknown>
  ): Promise<{ state: PresenceState; confidence: number }> {
    const db = getServiceClient();
    const now = Date.now();

    // Check if there's an active study session
    const { count: activeSessionCount } = await db
      .from("study_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "active");

    const hasActiveSession = (activeSessionCount ?? 0) > 0;

    // Check if there's an active lecture (lecture_progress updated in last 5 min)
    const lectureThreshold = new Date(now - 5 * 60_000).toISOString();
    const { count: activeLectureCount } = await db
      .from("lecture_progress")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("completed", false)
      .gte("last_watched_at", lectureThreshold);

    const hasActiveLecture = (activeLectureCount ?? 0) > 0;

    // Determine state priority
    let state: PresenceState = "AVAILABLE";

    if (hasActiveSession || latestSignal === "study_session_open") {
      state = "STUDYING";
    } else if (hasActiveLecture || latestSignal === "lecture_active") {
      state = "STUDYING";
    } else if (latestSignal === "study_session_ended" || latestSignal === "lecture_ended") {
      state = "AVAILABLE";
    }

    // Check sleep schedule
    const inSleep = await this.isInSleepWindow(studentId);
    if (inSleep && state === "AVAILABLE") {
      state = "SLEEPING";
    }

    // Compute confidence from active signals
    let rawConfidence = 0;
    const signalCutoff = new Date(now - 10 * 60_000).toISOString(); // 10 min

    for (const [signalType, weight] of Object.entries(SIGNAL_WEIGHTS)) {
      const entry = signals[signalType] as { received_at?: string } | undefined;
      if (entry?.received_at && entry.received_at >= signalCutoff) {
        rawConfidence += weight;
      }
    }

    // Active session / lecture adds certainty boost
    if (hasActiveSession)  rawConfidence += 0.10;
    if (hasActiveLecture)  rawConfidence += 0.10;

    const confidence = PresenceService.capConfidence(rawConfidence);

    return { state, confidence };
  }

  private async updatePresence(
    studentId: string,
    newState: PresenceState,
    confidence: number,
    signals: Record<string, unknown>,
    prevState: PresenceState
  ) {
    // Final INV-009 assertion
    PresenceService.assertConfidenceInvariant(confidence);

    const db = getServiceClient();

    const { data, error } = await db
      .from("presence_state")
      .upsert(
        {
          student_id:     studentId,
          state:          newState,
          confidence,
          source_signals: signals,
          updated_at:     new Date().toISOString(),
        },
        { onConflict: "student_id" }
      )
      .select()
      .single();

    if (error || !data) {
      throw new TilluError(error?.message ?? "Failed to update presence", "DATABASE_ERROR", true);
    }

    // Emit PRESENCE_CHANGED if state changed
    if (newState !== prevState) {
      await db.from("presence_events").insert({
        student_id:  studentId,
        from_state:  prevState,
        to_state:    newState,
        trigger:     "signal",
        confidence,
      });

      await this.eventBus
        .emit(
          EventType.PRESENCE_CHANGED,
          studentId,
          { from_state: prevState, to_state: newState, confidence },
          { source: "presence_service" }
        )
        .catch((err: unknown) => {
          logger.warn("presence_service.event_emit_failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });

      logger.info("presence_service.state_changed", {
        student_id: studentId,
        from:       prevState,
        to:         newState,
        confidence,
      });
    }

    return data;
  }

  private async isInSleepWindow(studentId: string): Promise<boolean> {
    const db = getServiceClient();
    const { data: prefs } = await db
      .from("student_preferences")
      .select("key, value")
      .eq("student_id", studentId)
      .in("key", ["sleep_start", "sleep_end"]);

    const prefMap: Record<string, string> = {};
    for (const p of prefs ?? []) prefMap[p.key] = p.value;

    const sleepStart = prefMap["sleep_start"] ?? "23:00";
    const sleepEnd   = prefMap["sleep_end"]   ?? "06:30";

    const now         = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    if (sleepStart > sleepEnd) {
      return currentTime >= sleepStart || currentTime <= sleepEnd;
    }
    return currentTime >= sleepStart && currentTime <= sleepEnd;
  }
}
