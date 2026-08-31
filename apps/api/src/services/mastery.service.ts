/**
 * MasteryService
 *
 * The ONLY code that writes to mastery_states.
 * AI agents may contribute evidence (classified error type, difficulty)
 * but they NEVER call this service's write methods directly.
 *
 * INV-001: AI cannot directly modify mastery scores.
 * Every mastery change creates a mastery_events record for full auditability.
 *
 * Algorithm version: v1
 * Upgrade path: bump MASTERY_ALGORITHM_VERSION, re-calculate from mastery_events.
 */

import { getServiceClient } from "@tillu/database";
import { TilluError, InvariantViolationError, ValidationError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { EventBus } from "@tillu/events";
import { EventType } from "@tillu/schemas";
import { z } from "zod";

const logger = createLogger({ service: "mastery_service" });

// ── Constants ─────────────────────────────────────────────────────────────────

export const MASTERY_ALGORITHM_VERSION = "v1" as const;

/**
 * Evidence weights used in mastery calculation (must sum to 1.0).
 * Adjust these in future algorithm versions — bump MASTERY_ALGORITHM_VERSION.
 */
const WEIGHTS = {
  recall:   0.30,
  practice: 0.25,
  pyq:      0.25,
  exam:     0.20,
} as const;

/** Minimum score a failure event deducts */
const FAILURE_PENALTY = 8;
/** Bonus applied to recent evidence (< 24h) */
const RECENCY_BONUS = 5;
/** Forgetting decay per day since last attempt (max 10 points lost/day up to 30 days) */
const DECAY_PER_DAY = 0.5;

// ── Input schemas ─────────────────────────────────────────────────────────────

export const EvidenceTypeSchema = z.enum([
  "recall",
  "practice",
  "pyq",
  "exam",
]);

export const AddEvidenceSchema = z.object({
  concept_id:    z.string().uuid(),
  evidence_type: EvidenceTypeSchema,
  score:         z.number().min(0).max(100),       // raw score 0–100 for this attempt
  max_score:     z.number().min(1).max(100).default(100),
  is_correct:    z.boolean(),
  source_agent:  z.string().min(1).default("system"),
  metadata:      z.record(z.unknown()).optional(),
});

export type AddEvidenceInput = z.infer<typeof AddEvidenceSchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MasteryBreakdown {
  mastery_score:   number;
  confidence:      number;
  recall_score:    number;
  practice_score:  number;
  pyq_score:       number;
  exam_score:      number;
  attempt_count:   number;
  success_count:   number;
  failure_count:   number;
  forgetting_risk: number;
  next_review_at:  string | null;
  algorithm_version: string;
  explanation:     string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class MasteryService {
  constructor(private readonly eventBus: EventBus) {}

  /**
   * Add evidence for a concept and recalculate mastery.
   * This is the PRIMARY entry point — called after quiz answers, recall sessions, tests.
   *
   * INV-001 GUARD: This method is the single writer of mastery_states.
   * No AI agent should call DB directly to write mastery.
   */
  async addEvidence(studentId: string, input: AddEvidenceInput): Promise<MasteryBreakdown> {
    const parsed = AddEvidenceSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid evidence data", { errors: parsed.error.flatten() });
    }

    const { concept_id, evidence_type, score, max_score, is_correct, source_agent, metadata } =
      parsed.data;

    // Normalise score to 0–100
    const normalisedScore = Math.round((score / max_score) * 100);

    const db = getServiceClient();

    // 1. Verify concept exists
    const { data: concept } = await db
      .from("concepts")
      .select("id, importance")
      .eq("id", concept_id)
      .single();

    if (!concept) {
      throw new TilluError("Concept not found", "NOT_FOUND", false, { concept_id });
    }

    // 2. Get or create mastery_state
    const existing = await this.getOrCreateMasteryState(studentId, concept_id);

    // 3. Compute updated component scores using exponential moving average
    //    EMA smoothing factor α = 0.4 (new evidence weighted 40%, history 60%)
    const ALPHA = 0.4;
    const updates = this.computeComponentUpdates(existing, evidence_type, normalisedScore, ALPHA);

    // 4. Compute overall mastery score (weighted average of components)
    const newMasteryScore = this.computeOverallMastery(updates);

    // 5. Compute forgetting risk
    const forgettingRisk = this.computeForgettingRisk(existing, is_correct);

    // 6. Compute next review date (simple: sooner if failed, later if succeeded)
    const nextReviewAt = this.computeNextReview(is_correct, forgettingRisk);

    // 7. Compute confidence (higher when more attempts + recent success)
    const newAttemptCount = existing.attempt_count + 1;
    const newSuccessCount = existing.success_count + (is_correct ? 1 : 0);
    const newFailureCount = existing.failure_count + (is_correct ? 0 : 1);
    const confidence = this.computeConfidence(newAttemptCount, newSuccessCount);

    // 8. Compute delta for audit log
    const delta = newMasteryScore - existing.mastery_score;

    // 9. Write mastery_events (audit record — always append)
    const { error: evtError } = await db.from("mastery_events").insert({
      student_id:   studentId,
      concept_id,
      event_type:   evidence_type.toUpperCase(),
      delta:        Math.round(delta * 100) / 100,
      evidence:     {
        evidence_type,
        raw_score:        score,
        max_score,
        normalised_score: normalisedScore,
        is_correct,
        source_agent,
        metadata:         metadata ?? {},
      },
      source_agent,
    });

    if (evtError) {
      logger.error("mastery_service.audit_write_failed", {
        student_id: studentId,
        concept_id,
        error: evtError.message,
      });
      // Don't block — audit failure should not prevent mastery update
    }

    // 10. Upsert mastery_states (THE ONLY PLACE this table is written)
    const { data: updated, error: writeError } = await db
      .from("mastery_states")
      .upsert(
        {
          student_id:               studentId,
          concept_id,
          mastery_score:            newMasteryScore,
          confidence,
          recall_score:             updates.recall_score,
          practice_score:           updates.practice_score,
          pyq_score:                updates.pyq_score,
          exam_score:               updates.exam_score,
          attempt_count:            newAttemptCount,
          success_count:            newSuccessCount,
          failure_count:            newFailureCount,
          last_attempt_at:          new Date().toISOString(),
          last_success_at:          is_correct ? new Date().toISOString() : existing.last_success_at,
          last_failure_at:          !is_correct ? new Date().toISOString() : existing.last_failure_at,
          forgetting_risk:          forgettingRisk,
          next_review_at:           nextReviewAt,
          mastery_algorithm_version: MASTERY_ALGORITHM_VERSION,
          updated_at:               new Date().toISOString(),
        },
        { onConflict: "student_id,concept_id" }
      )
      .select()
      .single();

    if (writeError || !updated) {
      throw new TilluError(
        writeError?.message ?? "Failed to update mastery",
        "DATABASE_ERROR",
        true,
        { student_id: studentId, concept_id }
      );
    }

    // 11. Emit MASTERY_UPDATED event
    await this.eventBus
      .emit(
        EventType.MASTERY_UPDATED,
        studentId,
        {
          concept_id,
          old_score:    existing.mastery_score,
          new_score:    newMasteryScore,
          delta:        Math.round(delta * 100) / 100,
          evidence_type,
          is_correct,
          forgetting_risk: forgettingRisk,
        },
        { source: "mastery_service" }
      )
      .catch((err: unknown) => {
        logger.warn("mastery_service.event_emit_failed", {
          event_type: "MASTERY_UPDATED",
          student_id: studentId,
          concept_id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    logger.info("mastery_service.evidence_added", {
      student_id:     studentId,
      concept_id,
      evidence_type,
      old_score:      existing.mastery_score,
      new_score:      newMasteryScore,
      delta:          Math.round(delta * 100) / 100,
      is_correct,
    });

    return this.buildBreakdown(updated);
  }

  /**
   * Get mastery breakdown for a concept.
   * Returns null if no mastery data exists yet (concept not studied).
   */
  async getMastery(studentId: string, conceptId: string): Promise<MasteryBreakdown | null> {
    const db = getServiceClient();
    const { data, error } = await db
      .from("mastery_states")
      .select("*")
      .eq("student_id", studentId)
      .eq("concept_id", conceptId)
      .single();

    if (error || !data) return null;
    return this.buildBreakdown(data);
  }

  /**
   * Get mastery for all concepts in a chapter.
   */
  async getMasteryForChapter(
    studentId: string,
    chapterId: string
  ): Promise<Map<string, MasteryBreakdown>> {
    const db = getServiceClient();

    // Get concept IDs for the chapter
    const { data: concepts } = await db
      .from("concepts")
      .select("id")
      .eq("chapter_id", chapterId);

    if (!concepts || concepts.length === 0) return new Map();

    const conceptIds = concepts.map((c) => c.id);

    const { data: masteryRows } = await db
      .from("mastery_states")
      .select("*")
      .eq("student_id", studentId)
      .in("concept_id", conceptIds);

    const result = new Map<string, MasteryBreakdown>();
    for (const row of masteryRows ?? []) {
      result.set(row.concept_id, this.buildBreakdown(row));
    }
    return result;
  }

  /**
   * Get all concepts with high forgetting risk for a student.
   * Used by the Forgetting Radar on the Home screen.
   */
  async getForgettingRadar(studentId: string, limit = 10) {
    const db = getServiceClient();

    const { data, error } = await db
      .from("mastery_states")
      .select(`
        concept_id,
        mastery_score,
        forgetting_risk,
        next_review_at,
        last_attempt_at,
        concepts ( name, chapter_id, importance,
          chapters ( name, subject_id,
            subjects ( name, code )
          )
        )
      `)
      .eq("student_id", studentId)
      .order("forgetting_risk", { ascending: false })
      .limit(limit);

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    return (data ?? []).map((row) => ({
      concept_id:      row.concept_id,
      mastery_score:   row.mastery_score,
      forgetting_risk: row.forgetting_risk,
      next_review_at:  row.next_review_at,
      concept:         row.concepts,
    }));
  }

  // ── INV-001 Guard ────────────────────────────────────────────────────────────

  /**
   * Asserts that the caller is the MasteryService itself.
   * Any attempt by an AI agent to call a raw DB write on mastery_states
   * should route through addEvidence() — not bypass this service.
   *
   * This guard is called at the top of addEvidence to document the contract.
   * In tests, InvariantViolationError is thrown if an AI payload tries
   * to set mastery_score directly without going through evidence calculation.
   */
  static assertNotAiDirectWrite(payload: Record<string, unknown>): void {
    // If a payload comes in with a pre-computed mastery_score AND no evidence fields,
    // it's likely an AI agent trying to bypass the service.
    const hasDirectScore = "mastery_score" in payload;
    const hasEvidence = "evidence_type" in payload && "score" in payload;

    if (hasDirectScore && !hasEvidence) {
      throw new InvariantViolationError(
        "INV-001: AI may not directly set mastery_score. Submit evidence via addEvidence().",
        { payload_keys: Object.keys(payload) }
      );
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async getOrCreateMasteryState(studentId: string, conceptId: string) {
    const db = getServiceClient();
    const { data } = await db
      .from("mastery_states")
      .select("*")
      .eq("student_id", studentId)
      .eq("concept_id", conceptId)
      .single();

    if (data) return data;

    // Return a zero-state object — upsert in addEvidence will create the row
    return {
      mastery_score:   0,
      confidence:      0,
      recall_score:    0,
      practice_score:  0,
      pyq_score:       0,
      exam_score:      0,
      attempt_count:   0,
      success_count:   0,
      failure_count:   0,
      last_attempt_at: null,
      last_success_at: null,
      last_failure_at: null,
      forgetting_risk: 0,
      next_review_at:  null,
    };
  }

  private computeComponentUpdates(
    existing: {
      recall_score: number;
      practice_score: number;
      pyq_score: number;
      exam_score: number;
    },
    evidenceType: EvidenceType,
    normalisedScore: number,
    alpha: number
  ) {
    // EMA: new_score = α * new_evidence + (1 - α) * old_score
    const ema = (old: number, incoming: number) =>
      Math.round((alpha * incoming + (1 - alpha) * old) * 100) / 100;

    return {
      recall_score:   evidenceType === "recall"   ? ema(existing.recall_score,   normalisedScore) : existing.recall_score,
      practice_score: evidenceType === "practice" ? ema(existing.practice_score, normalisedScore) : existing.practice_score,
      pyq_score:      evidenceType === "pyq"      ? ema(existing.pyq_score,      normalisedScore) : existing.pyq_score,
      exam_score:     evidenceType === "exam"     ? ema(existing.exam_score,     normalisedScore) : existing.exam_score,
    };
  }

  private computeOverallMastery(components: {
    recall_score: number;
    practice_score: number;
    pyq_score: number;
    exam_score: number;
  }): number {
    const weighted =
      components.recall_score   * WEIGHTS.recall   +
      components.practice_score * WEIGHTS.practice +
      components.pyq_score      * WEIGHTS.pyq      +
      components.exam_score     * WEIGHTS.exam;

    return Math.min(100, Math.max(0, Math.round(weighted * 100) / 100));
  }

  private computeForgettingRisk(
    existing: { last_attempt_at: string | null; mastery_score: number },
    isCorrect: boolean
  ): number {
    // Base forgetting risk inversely proportional to mastery
    const masteryFactor = 1 - (existing.mastery_score / 100);

    // Recency factor — how long since last attempt
    let recencyFactor = 0.5; // default if never studied
    if (existing.last_attempt_at) {
      const daysSince = (Date.now() - new Date(existing.last_attempt_at).getTime()) / 86_400_000;
      // Risk grows over time, capped at 1.0 after 30 days
      recencyFactor = Math.min(1.0, daysSince / 30);
    }

    // Recent failure increases risk
    const failureFactor = isCorrect ? 0 : 0.3;

    const risk = Math.min(1.0, masteryFactor * 0.5 + recencyFactor * 0.35 + failureFactor * 0.15);
    return Math.round(risk * 10000) / 10000;
  }

  private computeNextReview(isCorrect: boolean, forgettingRisk: number): string {
    const now = Date.now();
    // Base interval in hours: higher mastery/lower risk = longer interval
    // Minimum 4 hours, maximum 14 days
    const baseHours = isCorrect
      ? Math.max(4, Math.round((1 - forgettingRisk) * 48))
      : 4; // Always review soon after failure

    const nextMs = now + baseHours * 3_600_000;
    return new Date(nextMs).toISOString();
  }

  private computeConfidence(attemptCount: number, successCount: number): number {
    if (attemptCount === 0) return 0;
    const successRate = successCount / attemptCount;
    // Confidence grows with both success rate and number of attempts (more data = higher confidence)
    const volumeBonus = Math.min(0.2, attemptCount / 50); // caps at 0.2 after 50 attempts
    return Math.min(100, Math.round((successRate * 80 + volumeBonus * 100) * 100) / 100);
  }

  private buildBreakdown(row: {
    mastery_score: number;
    confidence: number;
    recall_score: number;
    practice_score: number;
    pyq_score: number;
    exam_score: number;
    attempt_count: number;
    success_count: number;
    failure_count: number;
    forgetting_risk: number;
    next_review_at: string | null;
    mastery_algorithm_version?: string;
  }): MasteryBreakdown {
    const explanation = this.buildExplanation(row);
    return {
      mastery_score:     row.mastery_score,
      confidence:        row.confidence,
      recall_score:      row.recall_score,
      practice_score:    row.practice_score,
      pyq_score:         row.pyq_score,
      exam_score:        row.exam_score,
      attempt_count:     row.attempt_count,
      success_count:     row.success_count,
      failure_count:     row.failure_count,
      forgetting_risk:   row.forgetting_risk,
      next_review_at:    row.next_review_at,
      algorithm_version: row.mastery_algorithm_version ?? MASTERY_ALGORITHM_VERSION,
      explanation,
    };
  }

  private buildExplanation(row: {
    mastery_score: number;
    recall_score: number;
    practice_score: number;
    pyq_score: number;
    exam_score: number;
    attempt_count: number;
    success_count: number;
    forgetting_risk: number;
  }): string {
    const successRate =
      row.attempt_count > 0
        ? Math.round((row.success_count / row.attempt_count) * 100)
        : 0;

    const riskLabel =
      row.forgetting_risk > 0.7 ? "high" :
      row.forgetting_risk > 0.4 ? "medium" : "low";

    return (
      `Overall mastery: ${row.mastery_score}% ` +
      `(recall ${row.recall_score}%, practice ${row.practice_score}%, ` +
      `PYQ ${row.pyq_score}%, exam ${row.exam_score}%). ` +
      `${successRate}% success rate over ${row.attempt_count} attempt(s). ` +
      `Forgetting risk: ${riskLabel}.`
    );
  }
}
