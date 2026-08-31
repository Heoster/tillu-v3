/**
 * HFAdapter — Hugging Face Inference API
 * Last-resort fallback. Free but rate-limited and slower.
 */

import { CircuitBreaker } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import type { ProviderAdapter, GenerateOptions, GenerateResult, ProviderAdapterStatus } from "./base.js";

const logger = createLogger({ service: "hf_adapter" });

export class HFAdapter implements ProviderAdapter {
  readonly name = "huggingface";
  readonly priority = 4; // Last resort

  private readonly circuitBreaker: CircuitBreaker;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl = "https://api-inference.huggingface.co/models";

  constructor(options?: { failureThreshold?: number; cooldownMs?: number }) {
    this.apiKey = process.env["HF_API_KEY"] ?? "";
    this.defaultModel = "mistralai/Mistral-7B-Instruct-v0.3";

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: options?.failureThreshold ?? 3,
      cooldownMs: options?.cooldownMs ?? 120_000, // longer cooldown — slower provider
      name: "huggingface",
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
    if (!this.apiKey) throw new Error("HF_API_KEY not configured");

    const start = Date.now();
    const model = options.model ?? this.defaultModel;

    // Build a simple prompt from messages (HF doesn't use chat format natively)
    const prompt = messages
      .map((m) => `${m.role === "system" ? "System" : m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n") + "\nAssistant:";

    return this.circuitBreaker.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        options.timeoutMs ?? 45_000
      );

      try {
        const response = await fetch(`${this.baseUrl}/${model}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: options.maxTokens ?? 1024,
              temperature: options.temperature ?? 0.3,
              return_full_text: false,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`HF API error ${response.status}: ${body.slice(0, 200)}`);
        }

        const data = await response.json() as Array<{ generated_text: string }>;
        const content = data[0]?.generated_text ?? "";
        const latency = Date.now() - start;

        logger.info("hf_adapter.success", { model, latency_ms: latency });

        return {
          content,
          model,
          provider: this.name,
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
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
