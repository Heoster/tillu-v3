/**
 * Factory that creates the default ModelRouter with all configured providers.
 * Only providers with API keys set are included.
 * Priority order: Groq → Cerebras → OpenRouter → HF
 */

import { ModelRouter } from "./router.js";
import { GroqAdapter } from "./adapters/groq.js";
import { CerebrasAdapter } from "./adapters/cerebras.js";
import { OpenRouterAdapter } from "./adapters/openrouter.js";
import { HFAdapter } from "./adapters/hf.js";
import type { ProviderAdapter } from "./adapters/base.js";

let _router: ModelRouter | null = null;

export function createDefaultRouter(): ModelRouter {
  const providers: ProviderAdapter[] = [];

  // Add providers in priority order — only if keys are set
  if (process.env["GROQ_API_KEY"]) {
    providers.push(new GroqAdapter());
  }
  if (process.env["CEREBRAS_API_KEY"]) {
    providers.push(new CerebrasAdapter());
  }
  if (process.env["OPENROUTER_API_KEY"]) {
    providers.push(new OpenRouterAdapter());
  }
  if (process.env["HF_API_KEY"]) {
    providers.push(new HFAdapter());
  }

  if (providers.length === 0) {
    // No providers configured — create router with a no-op stub so the app
    // still starts; every generate() call will throw AIUnavailableError
    throw new Error(
      "No AI providers configured. Set at least one of: " +
      "GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, HF_API_KEY"
    );
  }

  return new ModelRouter(providers);
}

/** Singleton accessor for the API process */
export function getModelRouter(): ModelRouter {
  if (!_router) {
    _router = createDefaultRouter();
  }
  return _router;
}
