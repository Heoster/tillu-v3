/**
 * CerebrasAdapter
 * Ultra-fast inference provider — used for latency-sensitive tasks.
 * Free tier: rate-limited, OpenAI-compatible API.
 */

import { CircuitBreaker } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import type { ProviderAdapter, GenerateOptions, GenerateResult, ProviderAdapterStatus } from "./base.js";

const logger = createLogger({ service: "cerebras_adapter" });

export class CerebrasAdapter implements ProviderAdapter {
  readonly name = "cerebras";
  readonly priority = 2;

  private readonly circuitBreaker: CircuitBreaker;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl = "https://api.cerebras.ai/v1";

  constructor(options?: { failureThreshold?: number; cooldownMs?: number }) {
    this.apiKey = process.env["CEREBRAS_API_KEY"] ?? "";
    this.defaultModel = process.env["CEREBRAS_DEFAULT_MODEL"] ?? "llama3.3-70b";

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: options?.failureThreshold ?? 5,
      cooldownMs: options?.cooldownMs ?? 60_000,
      name: "cerebras",
    });
  }

  isAvailable(): boolean {
    if (!this.apiKey) return false;
    return this.circuitBreaker.getState() !== "OPEN";
  }

  async generate(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options: GenerateOptions = {}
  ): Promise<GenerateResult> {
    if (!this.apiKey) throw new Error("CEREBRAS_API_KEY not configured");

    const start = Date.now();

    return this.circuitBreaker.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        options.timeoutMs ?? 30_000
      );

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: options.model ?? this.defaultModel,
            messages,
            max_tokens: options.maxTokens ?? 2048,
            temperature: options.temperature ?? 0.3,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Cerebras API error ${response.status}: ${body.slice(0, 200)}`);
        }

        const data = await response.json() as {
          choices: Array<{ message: { content: string } }>;
          model: string;
          usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        };

        const content = data.choices[0]?.message.content ?? "";
        const latency = Date.now() - start;

        logger.info("cerebras_adapter.success", {
          model: data.model,
          latency_ms: latency,
          total_tokens: data.usage.total_tokens,
        });

        return {
          content,
          model: data.model,
          provider: this.name,
          usage: data.usage,
          latency_ms: latency,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  getStatus(): ProviderAdapterStatus {
    return {
      name: this.name,
      available: this.isAvailable(),
      circuit_state: this.circuitBreaker.getState(),
      failure_count: 0,
      last_failure_at: null,
    };
  }
}
