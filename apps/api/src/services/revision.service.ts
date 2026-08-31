/**
 * RevisionService
 *
 * Core Phase 3 service. Manages spaced-repetition scheduling for every concept
 * the student has studied.
 *
 * INV-003: Revision scheduling must be reproducible from stored state.
 * This means:
 *   - Algorithm version is stored on every revision_item row
 *   - Given the same revision_events history, running scheduleRevision() again
 *     produces the same next_review_at
 *   - No random seeds, no AI in the scheduling math
 *
 * Algorithm: SM-2 inspired (simplified for CBSE study context)
 *   - Ease factor (stability) adjusts based on recall quality 0–5
 *   - Interval grows on success, resets on failure
 *   - Forgetting risk = f(time since review, ease factor, mastery score)
 *   - Priority = importance × forgetting_risk × (1 - mastery_score/100)
 */

import { getServiceClient } from "@tillu/database";
import { TilluError, ValidationError, InvariantViolationError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { EventBus } from "@tillu/events";
import { EventType } from "@tillu/schemas";
import { z } from "zod";

const logger = createLogger({ service: "revision_service" });

export const REVISION_ALGORITHM_VERSION = "v1" as const;

// ── Spaced-repetition constants ───────────────────────────────────────────────

/** Initial interval (hours) for a new revision item */
const INITIAL_INTERVAL_HOURS = 24;
/** Minimum ease factor — prevents interval from shrinking below 1.3× */
const MIN_EASE = 1.3;
/** Maximum ease factor */
const MAX_EASE = 2.5;
/** Ease factor delta per quality grade */
const EASE_DELTA: Record<number, number> = {
  0: -0.30, // blackout
  1: -0.20, // incorrect but familiar
  2: -0.10, // incorrect but easy to recall
  3:  0.00, // correct with difficulty
  4:  0.10, // correct after hesitation
  5:  0.15, // perfect recall
};

// ── Input schemas ─────────────────────────────────────────────────────────────

export const CompleteRevisionSchema = z.object({
  revision_item_id: z.string().uuid(),
  outcome:          z.enum(["success", "failure", "partial"]),
  recall_quality:   z.number().int().min(0).max(5),
  notes:            z.string().optional(),
});

export const ScheduleRevisionSchema = z.object({
  concept_id:    z.string().uuid(),
  revision_type: z
    .enum(["recall", "formula", "reaction", "flashcard", "concept_explanation", "question", "pyq", "mixed"])
    .default("recall"),
  source_event:  z.string().optional(), // e.g. "lecture_completed", "quiz_failed"
});

export type CompleteRevisionInput = z.infer<typeof CompleteRevisionSchema>;
export type ScheduleRevisionInput = z.infer<typeof ScheduleRevisionSchema>;

// ── Service ───────────────────────────────────────────────────────────────────

export class RevisionService {
  constructor(private readonly eventBus: EventBus) {}

  /**
   * Schedule or reset a revision item for a concept.
   * Called after: lecture completed, quiz result, mastery event.
   *
   * INV-003: The scheduling is fully deterministic from stored inputs.
   */
  async scheduleRevision(studentId: string, input: ScheduleRevisionInput) {
    const parsed = ScheduleRevisionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid schedule input", { errors: parsed.error.flatten() });
    }

    const { concept_id, revision_type, source_event } = parsed.data;
    const db = getServiceClient();

    // Verify concept exists
    const { data: concept } = await db
      .from("concepts")
      .select("id, importance, chapters(name, subject_id)")
      .eq("id", concept_id)
      .single();

    if (!concept) {
      throw new TilluError("Concept not found", "NOT_FOUND", false, { concept_id });
    }

    const now = new Date().toISOString();
    const nextReviewAt = new Date(Date.now() + INITIAL_INTERVAL_HOURS * 3_600_000).toISOString();

    // Upsert revision item (idempotent — same concept gets updated, not duplicated)
    const { data: item, error } = await db
      .from("revision_items")
      .upsert(
        {
          student_id:               studentId,
          concept_id,
          revision_type,
          priority:                 0.5,
          difficulty:               0.5,
          stability:                2.0, // initial ease factor
          last_review_at:           null,
          next_review_at:           nextReviewAt,
          attempt_count:            0,
          success_count:            0,
          failure_count:            0,
          status:                   "active",
          revision_algorithm_version: REVISION_ALGORITHM_VERSION,
        },
        { onConflict: "student_id,concept_id" }
      )
      .select()
      .single();

    if (error || !item) {
      throw new TilluError(error?.message ?? "Failed to schedule revision", "DATABASE_ERROR", true);
    }

    // Emit REVISION_SCHEDULED
    await this.eventBus
      .emit(
        EventType.REVISION_SCHEDULED,
        studentId,
        { revision_item_id: item.id, concept_id, revision_type, next_review_at: nextReviewAt, source_event: source_event ?? null },
        { source: "revision_service" }
      )
      .catch((err: unknown) => {
        logger.warn("revision_service.event_emit_failed", {
          event_type: "REVISION_SCHEDULED",
          error: err instanceof Error ? err.message : String(err),
        });
      });

    logger.info("revision_service.scheduled", {
      student_id: studentId, concept_id, revision_type, next_review_at: nextReviewAt,
    });

    return item;
  }

  /**
   * Complete a revision session — record outcome and compute next interval.
   *
   * INV-003 guard: The next_review_at is computed ONLY from stored state
   * (current stability, attempt history, recall_quality). No external inputs.
   */
  async completeRevision(studentId: string, input: CompleteRevisionInput) {
    const parsed = CompleteRevisionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid revision completion", { errors: parsed.error.flatten() });
    }

    const { revision_item_id, outcome, recall_quality, notes } = parsed.data;
    const db = getServiceClient();

    // Load revision item
    const { data: item, error: loadErr } = await db
      .from("revision_items")
      .select("*")
      .eq("id", revision_item_id)
      .eq("student_id", studentId)
      .single();

    if (loadErr || !item) {
      throw new TilluError("Revision item not found", "NOT_FOUND", false, { revision_item_id });
    }

    // INV-003 Guard: verify algorithm version matches — if version changed, we must
    // recalculate from events rather than updating in place
    RevisionService.assertAlgorithmVersion(item.revision_algorithm_version);

    const isSuccess = outcome === "success";
    const isFailure = outcome === "failure";

    // ── SM-2 inspired interval calculation ──────────────────────────────────
    const currentStability = item.stability as number;
    const currentInterval = item.last_review_at
      ? (Date.now() - new Date(item.last_review_at).getTime()) / 3_600_000
      : INITIAL_INTERVAL_HOURS;

    // Update ease factor (stability)
    const easeDelta = EASE_DELTA[recall_quality] ?? 0;
    const newStability = Math.min(MAX_EASE, Math.max(MIN_EASE, currentStability + easeDelta));

    // Compute next interval
    let nextIntervalHours: number;
    if (isFailure || recall_quality < 3) {
      // Failed — reset to short interval
      nextIntervalHours = 4;
    } else {
      // Success — grow interval by stability factor
      nextIntervalHours = Math.round(currentInterval * newStability);
      // Cap at 30 days
      nextIntervalHours = Math.min(nextIntervalHours, 720);
      // Minimum 4 hours even on success
      nextIntervalHours = Math.max(nextIntervalHours, 4);
    }

    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + nextIntervalHours * 3_600_000).toISOString();

    // Compute forgetting risk for new state
    const forgettingRisk = this.computeForgettingRisk(
      newStability,
      nextIntervalHours,
      item.failure_count as number,
      isFailure
    );

    // Compute revision priority
    // Load concept importance for priority calculation
    const { data: conceptRow } = await db
      .from("concepts")
      .select("importance")
      .eq("id", item.concept_id)
      .single();
    const importance = (conceptRow?.importance ?? 3) / 5; // normalise to 0–1
    const priority = Math.min(1.0, importance * forgettingRisk * (isFailure ? 1.5 : 1.0));

    // ── Write revision_events (append-only audit) ────────────────────────────
    await db.from("revision_events").insert({
      revision_item_id,
      student_id:    studentId,
      outcome,
      recall_quality,
      notes:         notes ?? null,
    });

    // ── Update revision_items ────────────────────────────────────────────────
    const { data: updated, error: updateErr } = await db
      .from("revision_items")
      .update({
        stability:             newStability,
        priority,
        last_review_at:        now.toISOString(),
        next_review_at:        nextReviewAt,
        attempt_count:         (item.attempt_count as number) + 1,
        success_count:         (item.success_count as number) + (isSuccess ? 1 : 0),
        failure_count:         (item.failure_count as number) + (isFailure ? 1 : 0),
        revision_algorithm_version: REVISION_ALGORITHM_VERSION,
        updated_at:            now.toISOString(),
      })
      .eq("id", revision_item_id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw new TilluError(updateErr?.message ?? "Failed to update revision", "DATABASE_ERROR", true);
    }

    // ── Emit event ───────────────────────────────────────────────────────────
    const eventType = isSuccess
      ? EventType.REVISION_COMPLETED
      : EventType.REVISION_FAILED;

    await this.eventBus
      .emit(
        eventType,
        studentId,
        {
          revision_item_id,
          concept_id:     item.concept_id,
          outcome,
          recall_quality,
          next_review_at: nextReviewAt,
          interval_hours: nextIntervalHours,
          new_stability:  newStability,
        },
        { source: "revision_service" }
      )
      .catch((err: unknown) => {
        logger.warn("revision_service.event_emit_failed", {
          event_type: eventType,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    logger.info("revision_service.completed", {
      student_id:     studentId,
      revision_item_id,
      outcome,
      recall_quality,
      next_review_at: nextReviewAt,
      interval_hours: nextIntervalHours,
    });

    return {
      ...updated,
      next_review_at:  nextReviewAt,
      interval_hours:  nextIntervalHours,
      forgetting_risk: forgettingRisk,
    };
  }

  /**
   * Get all revision items due for review now.
   * Ordered by priority DESC (highest urgency first).
   */
  async getDueRevisions(studentId: string, limit = 20) {
    const db = getServiceClient();
    const now = new Date().toISOString();

    const { data, error } = await db
      .from("revision_items")
      .select(`
        id, concept_id, revision_type, priority, stability,
        next_review_at, last_review_at, attempt_count, success_count, failure_count,
        concepts (
          id, name, importance,
          chapters (
            id, name,
            subjects ( id, name, code )
          )
        )
      `)
      .eq("student_id", studentId)
      .eq("status", "active")
      .lte("next_review_at", now)
      .order("priority", { ascending: false })
      .limit(limit);

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
    return data ?? [];
  }

  /**
   * Get items coming up for review in the next N hours.
   */
  async getUpcomingRevisions(studentId: string, withinHours = 24, limit = 20) {
    const db = getServiceClient();
    const now = new Date().toISOString();
    const future = new Date(Date.now() + withinHours * 3_600_000).toISOString();

    const { data, error } = await db
      .from("revision_items")
      .select(`
        id, concept_id, revision_type, priority, next_review_at,
        concepts ( id, name, importance, chapters ( id, name, subjects ( name, code ) ) )
      `)
      .eq("student_id", studentId)
      .eq("status", "active")
      .gt("next_review_at", now)
      .lte("next_review_at", future)
      .order("next_review_at", { ascending: true })
      .limit(limit);

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
    return data ?? [];
  }

  /**
   * Forgetting radar — top N concepts by forgetting risk.
   * Combines revision priority with mastery forgetting risk.
   */
  async getForgettingRadar(studentId: string, limit = 10) {
    const db = getServiceClient();

    const { data, error } = await db
      .from("revision_items")
      .select(`
        id, concept_id, revision_type, priority, stability, next_review_at, last_review_at,
        concepts (
          id, name, importance,
          chapters ( id, name, subjects ( id, name, code ) )
        )
      `)
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .limit(limit);

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    return (data ?? []).map((item) => ({
      revision_item_id: item.id,
      concept_id:       item.concept_id,
      revision_type:    item.revision_type,
      priority:         item.priority,
      next_review_at:   item.next_review_at,
      overdue:          item.next_review_at != null && item.next_review_at <= new Date().toISOString(),
      concept:          item.concepts,
    }));
  }

  /**
   * Revision dashboard — combined view for the Revision tab.
   */
  async getDashboard(studentId: string) {
    const [dueNow, comingUp, radar] = await Promise.all([
      this.getDueRevisions(studentId, 10),
      this.getUpcomingRevisions(studentId, 24, 10),
      this.getForgettingRadar(studentId, 10),
    ]);

    const db = getServiceClient();

    // Memory health: proportion with stability > 1.8 (stable), 1.3–1.8 (at risk), < 1.3 (weak)
    const { data: allItems } = await db
      .from("revision_items")
      .select("stability, success_count, attempt_count")
      .eq("student_id", studentId)
      .eq("status", "active");

    const items = allItems ?? [];
    const strong = items.filter((i) => (i.stability as number) >= 1.8).length;
    const stable = items.filter(
      (i) => (i.stability as number) >= 1.3 && (i.stability as number) < 1.8
    ).length;
    const weak = items.filter((i) => (i.stability as number) < 1.3).length;
    const total = items.length;

    return {
      due_now:    dueNow,
      coming_up:  comingUp,
      radar,
      memory_health: {
        total,
        strong:       total > 0 ? Math.round((strong / total) * 100) : 0,
        stable:       total > 0 ? Math.round((stable / total) * 100) : 0,
        weak:         total > 0 ? Math.round((weak   / total) * 100) : 0,
        strong_count: strong,
        stable_count: stable,
        weak_count:   weak,
      },
    };
  }

  /**
   * Scan for revision items whose next_review_at has passed and emit REVISION_DUE.
   * Called by n8n morning workflow or Sentinel health check.
   */
  async scanAndEmitDue(studentId: string): Promise<number> {
    const due = await this.getDueRevisions(studentId, 50);
    let emitted = 0;

    for (const item of due) {
      await this.eventBus
        .emit(
          EventType.REVISION_DUE,
          studentId,
          {
            revision_item_id: item.id,
            concept_id:       item.concept_id,
            priority:         item.priority,
            next_review_at:   item.next_review_at,
          },
          { source: "revision_service" }
        )
        .catch(() => { /* non-blocking */ });
      emitted++;
    }

    return emitted;
  }

  // ── INV-003 guard ────────────────────────────────────────────────────────────

  /**
   * Asserts that the stored algorithm version matches current REVISION_ALGORITHM_VERSION.
   * If it doesn't match, the item must be migrated before it can be updated.
   * This ensures reproducibility — we never silently apply v2 logic to v1 data.
   */
  static assertAlgorithmVersion(storedVersion: string): void {
    if (storedVersion !== REVISION_ALGORITHM_VERSION) {
      throw new InvariantViolationError(
        `INV-003: revision_item has algorithm version "${storedVersion}" but current is "${REVISION_ALGORITHM_VERSION}". Migrate before updating.`,
        { stored: storedVersion, current: REVISION_ALGORITHM_VERSION }
      );
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private computeForgettingRisk(
    stability: number,
    intervalHours: number,
    failureCount: number,
    justFailed: boolean
  ): number {
    // Lower stability → higher risk
    const stabilityRisk = 1 - Math.min(1, (stability - MIN_EASE) / (MAX_EASE - MIN_EASE));
    // Short interval → lower forgetting risk (will be reviewed soon)
    const intervalRisk = Math.min(1, intervalHours / 720); // normalise to max 30 days
    // Repeated failures increase risk
    const failureRisk = Math.min(1, failureCount * 0.1);
    // Recent failure spike
    const recentFailure = justFailed ? 0.3 : 0;

    const risk = Math.min(
      1.0,
      stabilityRisk * 0.4 + intervalRisk * 0.3 + failureRisk * 0.2 + recentFailure * 0.1
    );
    return Math.round(risk * 10000) / 10000;
  }
}
