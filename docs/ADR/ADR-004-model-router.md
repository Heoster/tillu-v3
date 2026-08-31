# ADR-004 — Model Router Abstraction

**Date:** Phase 0  
**Status:** Accepted

## Context

Tillu uses multiple free AI providers: Groq, Cerebras, OpenRouter, Hugging Face. Each has different APIs, rate limits, model capabilities, and reliability characteristics. The question is how to manage these across 10+ agents.

## Decision

All AI calls go through a single `ModelRouter` in `packages/model-router`. No agent calls a provider SDK directly.

## Interface

```typescript
const result = await modelRouter.generate({
  task: "quiz_generation",
  prompt: "...",
  schema: QuizOutputSchema,           // Zod schema for output validation
  complexity: "standard",             // "fast" | "standard" | "complex"
  latency_budget_ms: 10000,
  token_budget: 2000,
  context: { student_id, concept_id } // for logging
});
```

The router selects a provider, calls it, validates the output against `schema`, and returns typed, validated output — or throws a typed error.

## Provider Adapters

Each adapter implements a common interface:
```typescript
interface ProviderAdapter {
  name: string;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  isAvailable(): boolean;
  getStatus(): ProviderStatus;
}
```

## Routing Logic

```
Task complexity + latency budget
          ↓
Select primary provider
          ↓
Circuit breaker OPEN? → skip to next
          ↓
Call provider (with timeout)
          ↓
Validate output schema
          ↓
Success → return
Failure → record failure, try next provider
          ↓
All providers failed → throw TilluError("AI_UNAVAILABLE")
          ↓
Caller uses deterministic fallback
```

## Circuit Breaker

Per-provider state machine:
- `CLOSED` → normal; requests pass through
- `OPEN` → provider failed N times; requests immediately rejected; cooldown timer
- `HALF_OPEN` → after cooldown; one test request; success → CLOSED; fail → OPEN

## Reasons

- Provider-agnostic agent code — agents don't need to change when providers change.
- Centralized fallback, retry, circuit breaking logic — not duplicated in 10 agents.
- Centralized token/quota tracking — one place to implement Quota Guardian.
- One place to add a new provider.
- Testable in isolation.

## Tradeoffs

- Extra indirection. Cost: minimal (one extra function call per AI request).
- All AI errors surface as `TilluError` — agents don't need to handle provider-specific error types.

## Consequences

- `packages/model-router` is a critical shared package. Breaking changes need migration.
- Every AI call is logged with `provider`, `model`, `latency_ms`, `token_count`, `task`.
- Quota Guardian reads from the model-router's usage log.
