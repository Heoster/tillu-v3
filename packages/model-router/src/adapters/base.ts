import { z } from "zod";

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface GenerateResult {
  content: string;
  model: string;
  provider: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

/**
 * Common interface all provider adapters must implement.
 * Phase 3: implement concrete adapters for Groq, Cerebras, OpenRouter, HF.
 */
export interface ProviderAdapter {
  readonly name: string;
  readonly priority: number;

  /** Return true if this provider is enabled and not circuit-broken */
  isAvailable(): boolean;

  /** Call the provider to generate a completion */
  generate(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: GenerateOptions
  ): Promise<GenerateResult>;

  /** Current circuit breaker / health status */
  getStatus(): ProviderAdapterStatus;
}

export interface ProviderAdapterStatus {
  name: string;
  available: boolean;
  circuit_state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failure_count: number;
  last_failure_at: string | null;
}

/**
 * Task complexity hint — used by ModelRouter to select appropriate provider.
 */
export const TaskComplexitySchema = z.enum(["fast", "standard", "complex"]);
export type TaskComplexity = z.infer<typeof TaskComplexitySchema>;
