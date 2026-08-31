/**
 * @tillu/model-router
 *
 * Provider abstraction for all AI model calls in Tillu.
 * Rules:
 * - No agent or service calls a provider SDK directly.
 * - All AI calls go through ModelRouter.generate().
 * - Every call is logged with provider, model, latency_ms, token_count.
 * - Output validated against Zod schema before returning.
 * - On failure: retry → next provider → throw AIUnavailableError.
 */

export { ModelRouter } from "./router.js";
export type { GenerateRequest, GenerateResponse, ProviderStatus } from "./router.js";
export type { ProviderAdapter } from "./adapters/base.js";
export { GroqAdapter } from "./adapters/groq.js";
export { CerebrasAdapter } from "./adapters/cerebras.js";
export { OpenRouterAdapter } from "./adapters/openrouter.js";
export { HFAdapter } from "./adapters/hf.js";
export { createDefaultRouter } from "./factory.js";
export { QuotaGuardian, getQuotaGuardian } from "./quota-guardian.js";
export type { QuotaStatus } from "./quota-guardian.js";
