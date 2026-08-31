/**
 * Tutor Agent Handler
 *
 * Four actions:
 *   hint     — give a hint, don't reveal answer
 *   explain  — evaluate student's attempt, explain correctly
 *   reveal   — student explicitly requests full answer (show_answer)
 *   similar  — generate a similar practice question
 *
 * The hint-first sequence enforced by the prompt, not by gating —
 * the student can always call "reveal" but Tillu defaults to "hint".
 */

import { getModelRouter } from "@tillu/model-router";
import { createLogger } from "@tillu/logging";
import { TilluError, AIUnavailableError } from "@tillu/utilities";
import {
  TutorRequestPayloadSchema,
  TutorOutputSchema,
  type TutorOutput,
  type TutorRequestPayload,
} from "./schemas.js";
import {
  TUTOR_SYSTEM_PROMPT,
  buildHintPrompt,
  buildExplainPrompt,
  buildRevealPrompt,
  buildSimilarPrompt,
} from "./prompts/tutor_v1.js";

const logger = createLogger({ service: "tutor_agent" });

export async function handleTutor(
  payload: Record<string, unknown>
): Promise<TutorOutput & { provider: string; model: string; latency_ms: number }> {
  const parsed = TutorRequestPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new TilluError("Invalid tutor request", "VALIDATION_ERROR", false, {
      errors: parsed.error.flatten(),
    });
  }

  const { action, question, subject, concept, student_answer, student_id } = parsed.data;

  const userPrompt = buildUserPrompt(action, question, subject, concept, student_answer);

  logger.info("tutor_agent.started", {
    student_id,
    action,
    subject,
    question: question.slice(0, 60),
  });

  try {
    const response = await getModelRouter().generate({
      task: `tutor_${action}`,
      systemPrompt: TUTOR_SYSTEM_PROMPT,
      userPrompt,
      outputSchema: TutorOutputSchema,
      complexity: "standard",
      latencyBudgetMs: 20_000,
      tokenBudget: 1024,
      context: { student_id },
    });

    logger.info("tutor_agent.completed", {
      student_id,
      action,
      mode: response.result.mode,
      provider: response.provider,
      latency_ms: response.latency_ms,
    });

    return {
      ...response.result,
      provider: response.provider,
      model: response.model,
      latency_ms: response.latency_ms,
    };
  } catch (err) {
    logger.error("tutor_agent.failed", {
      student_id,
      action,
      error: err instanceof Error ? err.message : String(err),
    });

    // Deterministic fallback — give a generic hint when AI is unavailable
    if (err instanceof AIUnavailableError) {
      return deterministicFallback(action, concept);
    }

    throw err;
  }
}

function buildUserPrompt(
  action: TutorRequestPayload["action"],
  question: string,
  subject: string,
  concept: string,
  studentAnswer?: string
): string {
  switch (action) {
    case "hint":    return buildHintPrompt(question, subject, concept);
    case "explain": return buildExplainPrompt(question, studentAnswer ?? "", subject);
    case "reveal":  return buildRevealPrompt(question, subject);
    case "similar": return buildSimilarPrompt(question, subject, concept);
  }
}

/** Fallback when all AI providers are unavailable */
function deterministicFallback(
  action: TutorRequestPayload["action"],
  concept: string
): TutorOutput & { provider: string; model: string; latency_ms: number } {
  const messages: Record<TutorRequestPayload["action"], string> = {
    hint:    `Think about the core definition of "${concept}". What formula or principle applies here?`,
    explain: `Review the concept "${concept}" in your NCERT textbook. Work through the standard method step by step.`,
    reveal:  `Tutor is temporarily unavailable. Please refer to your NCERT textbook for the solution.`,
    similar: `Practice more questions on "${concept}" from your NCERT exercises.`,
  };

  return {
    mode: action === "reveal" ? "answer" : action === "similar" ? "similar_question" : "hint",
    content: messages[action],
    hint: action === "hint" ? messages.hint : null,
    follow_up_question: null,
    correct_method: null,
    concept_to_review: concept || null,
    similar_question: null,
    provider: "deterministic_fallback",
    model: "none",
    latency_ms: 0,
  };
}

export async function syntheticTest(): Promise<{ pass: boolean; details: string }> {
  try {
    const result = await handleTutor({
      action: "hint",
      question: "What is the lens formula?",
      subject: "Physics",
      concept: "Ray Optics",
      student_id: "00000000-0000-0000-0000-000000000001",
    });

    if (!result.content) {
      return { pass: false, details: "Empty content returned" };
    }
    if (result.mode !== "hint") {
      return { pass: false, details: `Expected mode 'hint', got '${result.mode}'` };
    }

    return { pass: true, details: `Hint returned via ${result.provider}` };
  } catch (err) {
    return { pass: false, details: err instanceof Error ? err.message : String(err) };
  }
}
