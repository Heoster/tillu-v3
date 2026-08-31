import { z } from "zod";
import type { ProviderAdapter } from "./adapters/base.js";
import type { TaskComplexity } from "./adapters/base.js";
import { AIUnavailableError, AIOutputValidationError, retry } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { getQuotaGuardian } from "./quota-guardian.js";

const logger = createLogger({ service: "model_router" });

export interface GenerateRequest<TOutput> {
  /** Human-readable task name for logging */
  task: string;
  /** System prompt */
  systemPrompt: string;
  /** User prompt */
  userPrompt: string;
  /** Zod schema to validate the raw string output against */
  outputSchema: z.ZodSchema<TOutput>;
  /** Complexity hint for provider selection */
  complexity?: TaskComplexity;
  /** Max time to wait for a response */
  latencyBudgetMs?: number;
  /** Token budget (soft limit) */
  tokenBudget?: number;
  /** Context for logging/tracing */
  context?: {
    request_id?: string;
    trace_id?: string;
    student_id?: string;
    [key: string]: string | undefined;
  };
}

export interface GenerateResponse<TOutput> {
  result: TOutput;
  provider: string;
  model: string;
  latency_ms: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  circuit_state: string;
  failure_count: number;
  last_failure_at: string | null;
}

/**
 * ModelRouter
 *
 * Routes AI generation requests to the appropriate provider.
 * Handles retry, fallback, circuit breaking, output validation.
 *
 * Phase 0: skeleton with interfaces defined.
 * Phase 3: full implementation with real provider adapters.
 */
export class ModelRouter {
  constructor(private readonly providers: ProviderAdapter[]) {
    if (providers.length === 0) {
      throw new Error("ModelRouter requires at least one provider");
    }
  }

  /**
   * Generate structured AI output, validated against outputSchema.
   *
   * Tries providers in priority order until one succeeds.
   * Validates output with Zod before returning.
   * Throws AIUnavailableError if all providers fail.
   */
  async generate<TOutput>(
    request: GenerateRequest<TOutput>
  ): Promise<GenerateResponse<TOutput>> {
    const available = this.providers
      .filter((p) => p.isAvailable())
      .sort((a, b) => a.priority - b.priority);

    if (available.length === 0) {
      throw new AIUnavailableError({ task: request.task });
    }

    let lastError: unknown;

    for (const provider of available) {
      // QuotaGuardian: skip provider if quota is exhausted for this task
      if (!getQuotaGuardian().canUseProvider(provider.name, request.task)) {
        continue;
      }

      try {
        const result = await retry(
          () =>
            provider.generate(
              [
                { role: "system", content: request.systemPrompt },
                { role: "user", content: request.userPrompt },
              ],
              {
                maxTokens: request.tokenBudget,
                timeoutMs: request.latencyBudgetMs ?? 30_000,
              }
            ),
          { maxAttempts: 2, baseDelayMs: 1000 }
        );

        // Validate output
        const parsed = this.parseAndValidate(result.content, request.outputSchema, request.task);

        logger.info("model_router.generate.success", {
          task: request.task,
          provider: provider.name,
          model: result.model,
          latency_ms: result.latency_ms,
          total_tokens: result.usage.total_tokens,
          ...request.context,
        });

        // Record usage with QuotaGuardian
        getQuotaGuardian().recordUsage(
          provider.name,
          result.usage.total_tokens,
          "success",
          result.model,
          request.task
        );

        return {
          result: parsed,
          provider: provider.name,
          model: result.model,
          latency_ms: result.latency_ms,
          usage: result.usage,
        };
      } catch (err) {
        lastError = err;
        logger.warn("model_router.generate.provider_failed", {
          task: request.task,
          provider: provider.name,
          error: err instanceof Error ? err.message : String(err),
          ...request.context,
        });
      }
    }

    throw new AIUnavailableError({ task: request.task, lastError: String(lastError) });
  }

  /** Get status of all providers */
  getProviderStatuses(): ProviderStatus[] {
    return this.providers.map((p) => {
      const s = p.getStatus();
      return {
        name: s.name,
        available: s.available,
        circuit_state: s.circuit_state,
        failure_count: s.failure_count,
        last_failure_at: s.last_failure_at,
      };
    });
  }

  private parseAndValidate<T>(
    rawContent: string,
    schema: z.ZodSchema<T>,
    task: string
  ): T {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match?.[1]) {
        try {
          parsed = JSON.parse(match[1]);
        } catch {
          throw new AIOutputValidationError(
            `AI output for task "${task}" is not valid JSON`,
            { raw: rawContent.slice(0, 200) }
          );
        }
      } else {
        throw new AIOutputValidationError(
          `AI output for task "${task}" is not valid JSON`,
          { raw: rawContent.slice(0, 200) }
        );
      }
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new AIOutputValidationError(
        `AI output for task "${task}" failed schema validation`,
        { errors: result.error.flatten(), raw: rawContent.slice(0, 200) }
      );
    }

    return result.data;
  }
}
