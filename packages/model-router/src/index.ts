/**
 * @tillu/model-router
 *
 * Provider abstraction for all AI model calls in Tillu.
 *
 * Rules:
 * - No agent or service calls a provider SDK directly.
 * - All AI calls go through ModelRouter.generate().
 * - Every AI call is logged with provider, model, latency_ms, token_count.
 * - All output is validated against a Zod schema before returning.
 * - On failure: retry → next provider → throw AIUnavailableError.
 *
 * Phase 0: skeleton — full implementation in Phase 3.
 */

export { ModelRouter } from "./router.js";
export type { GenerateRequest, GenerateResponse, ProviderStatus } from "./router.js";
export type { ProviderAdapter } from "./adapters/base.js";
