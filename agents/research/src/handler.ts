/**
 * Research Agent Handler
 *
 * Pipeline:
 *   1. Validate request payload
 *   2. Create research_query record in DB
 *   3. Call ModelRouter → AI generates sourced claims
 *   4. Validate AI output with Zod (retry up to 2x, then fallback)
 *   5. Store research_sources and research_claims
 *   6. Update query status to completed
 *   7. Return structured result
 *
 * Every claim has a confidence level.
 * "UNVERIFIED" claims are never silently promoted.
 */

import { v4 as uuidv4 } from "uuid";
import { getServiceClient } from "@tillu/database";
import { getModelRouter } from "@tillu/model-router";
import { createLogger } from "@tillu/logging";
import { TilluError, AIUnavailableError } from "@tillu/utilities";
import {
  ResearchRequestPayloadSchema,
  ResearchOutputSchema,
  type ResearchOutput,
  type ResearchRequestPayload,
} from "./schemas.js";
import {
  RESEARCH_SYSTEM_PROMPT,
  buildResearchUserPrompt,
} from "./prompts/research_v1.js";

const logger = createLogger({ service: "research_agent" });

const PROMPT_VERSION = "research_v1";

export async function handleResearch(
  payload: Record<string, unknown>
): Promise<{
  query_id: string;
  summary: string;
  claims: ResearchOutput["claims"];
  board_tip: string | null | undefined;
  related_concepts: string[];
  possible_exam_questions: string[];
  provider: string;
  model: string;
  latency_ms: number;
}> {
  // 1. Validate payload
  const parsed = ResearchRequestPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new TilluError("Invalid research request", "VALIDATION_ERROR", false, {
      errors: parsed.error.flatten(),
    });
  }

  const { query, subject, context, student_id, query_id } = parsed.data;
  const db = getServiceClient();

  // 2. Upsert query record
  const resolvedQueryId = query_id ?? uuidv4();
  await db.from("research_queries").upsert(
    {
      id: resolvedQueryId,
      student_id,
      query,
      status: "running",
    },
    { onConflict: "id" }
  );

  logger.info("research_agent.started", {
    query_id: resolvedQueryId,
    student_id,
    subject,
    query: query.slice(0, 80),
  });

  let aiResult: {
    result: ResearchOutput;
    provider: string;
    model: string;
    latency_ms: number;
  };

  // 3. Call ModelRouter with schema validation
  try {
    const response = await getModelRouter().generate({
      task: "research",
      systemPrompt: RESEARCH_SYSTEM_PROMPT,
      userPrompt: buildResearchUserPrompt(query, subject, context),
      outputSchema: ResearchOutputSchema,
      complexity: "complex",
      latencyBudgetMs: 30_000,
      tokenBudget: 2048,
      context: { student_id, query_id: resolvedQueryId },
    });

    aiResult = {
      result: response.result,
      provider: response.provider,
      model: response.model,
      latency_ms: response.latency_ms,
    };
  } catch (err) {
    // 4a. All providers failed — mark query failed and throw
    await db
      .from("research_queries")
      .update({ status: "failed" })
      .eq("id", resolvedQueryId);

    logger.error("research_agent.ai_failed", {
      query_id: resolvedQueryId,
      error: err instanceof Error ? err.message : String(err),
    });

    throw new AIUnavailableError({
      query_id: resolvedQueryId,
      reason: "All model providers failed",
    });
  }

  const { result, provider, model, latency_ms } = aiResult;

  // 5. Store sources (one per unique source_hint)
  const sourceHints = new Set(
    result.claims
      .map((c) => c.source_hint)
      .filter((s): s is string => typeof s === "string" && s.length > 0)
  );

  const sourceIdMap = new Map<string, string>();

  for (const hint of sourceHints) {
    const sourceId = uuidv4();
    sourceIdMap.set(hint, sourceId);
    await db.from("research_sources").insert({
      id: sourceId,
      query_id: resolvedQueryId,
      url: "",           // real URL not available from AI output
      title: hint,
      domain: "ncert",   // conservative default
      source_type: "reference",
      retrieved_at: new Date().toISOString(),
      content_hash: "",
      quality_score: 0.7,
    });
  }

  // 6. Store claims
  for (const claim of result.claims) {
    const sourceIds: string[] = [];
    if (claim.source_hint && sourceIdMap.has(claim.source_hint)) {
      sourceIds.push(sourceIdMap.get(claim.source_hint)!);
    }

    await db.from("research_claims").insert({
      id: uuidv4(),
      query_id: resolvedQueryId,
      claim: claim.claim,
      confidence: claim.confidence,
      source_ids: sourceIds,
    });
  }

  // 7. Mark query completed
  await db
    .from("research_queries")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", resolvedQueryId);

  logger.info("research_agent.completed", {
    query_id: resolvedQueryId,
    claims_count: result.claims.length,
    provider,
    model,
    latency_ms,
  });

  return {
    query_id: resolvedQueryId,
    summary: result.summary,
    claims: result.claims,
    board_tip: result.board_tip,
    related_concepts: result.related_concepts ?? [],
    possible_exam_questions: result.possible_exam_questions ?? [],
    provider,
    model,
    latency_ms,
  };
}

/** Synthetic test — run a known question and verify the output shape */
export async function syntheticTest(): Promise<{ pass: boolean; details: string }> {
  try {
    const result = await handleResearch({
      query: "What is Ohm's Law?",
      subject: "Physics",
      student_id: "00000000-0000-0000-0000-000000000001",
    });

    if (!result.summary || result.claims.length === 0) {
      return { pass: false, details: "Empty summary or no claims returned" };
    }

    const hasConfidenceLevels = result.claims.every((c) =>
      ["HIGH", "MEDIUM", "LOW", "UNVERIFIED"].includes(c.confidence)
    );

    if (!hasConfidenceLevels) {
      return { pass: false, details: "Missing or invalid confidence levels" };
    }

    return { pass: true, details: `Returned ${result.claims.length} claims via ${result.provider}` };
  } catch (err) {
    return { pass: false, details: err instanceof Error ? err.message : String(err) };
  }
}
