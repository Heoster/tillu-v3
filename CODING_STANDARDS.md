# TILLU — Coding Standards

> These standards apply from the first commit. They are not aspirational — they are enforced by CI.

---

## 1. Language

- **TypeScript strict mode everywhere.** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- No `any`. Use `unknown` and narrow explicitly.
- No `// @ts-ignore`. Fix the underlying problem.
- No `as SomeType` casts unless inside a validated boundary (e.g. after Zod parse). Comment why.

---

## 2. Code Structure

- **One concern per file.** A file that exports a service should not also export unrelated utilities.
- **Max file length: 300 lines.** If it's longer, split it.
- **Max function length: 50 lines.** If it's longer, decompose it.
- No circular imports between packages. The dependency direction is:
  ```
  apps/* → packages/*
  agents/* → packages/*
  packages/* → packages/* (no cycles)
  ```

---

## 3. Naming

- Files and directories: `kebab-case`
- Classes: `PascalCase`
- Functions, variables, method names: `camelCase`
- Constants and environment values: `SCREAMING_SNAKE_CASE`
- Database columns and event types: `snake_case`
- Zod schemas: `PascalCase` with `Schema` suffix — e.g. `QuizAttemptSchema`
- Typed interfaces/types: `PascalCase` — e.g. `QuizAttempt`

---

## 4. Error Handling

- **Never let raw exceptions reach the user or the API consumer.**
- Use typed error classes from `packages/utilities/errors`:
  ```typescript
  class TilluError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly recoverable: boolean,
      public readonly context?: Record<string, unknown>
    ) { ... }
  }
  ```
- Every `try/catch` must either handle the error or rethrow as a typed `TilluError`.
- API error responses must use the standard shape:
  ```json
  {
    "error": {
      "code": "MASTERY_CALCULATION_FAILED",
      "message": "Could not calculate mastery. Please try again.",
      "request_id": "uuid"
    }
  }
  ```

---

## 5. Validation

- **All API inputs** are validated with Zod schemas from `packages/schemas` before any business logic runs.
- **All AI/LLM outputs** are validated with Zod schemas before being stored or acted on.
- Validation failures on AI output → retry → fallback model → deterministic fallback → log + surface error.
- No schema may be defined inline inside a route handler. They live in `packages/schemas`.

---

## 6. Logging

Use the logger from `packages/logging`. Never use `console.log` in production code.

Every log entry must include:
```typescript
logger.info("quiz generated", {
  request_id,
  trace_id,
  student_id,
  quiz_id,
  latency_ms,
  provider,
});
```

Never log:
- API keys or secrets
- Raw student answers
- Full request bodies containing PII
- Database connection strings

---

## 7. Database Access

- All DB access goes through typed query functions in `packages/database`.
- No raw SQL strings scattered through services — use parameterized queries or the Supabase typed client.
- Service-role key is ONLY used inside `apps/api` and agent server processes — never in `apps/web`.
- Every table has RLS enabled. Test RLS policies with `rls.spec.ts`.

---

## 8. AI/LLM Rules

- No direct provider calls (e.g. `groq.chat(...)`) outside `packages/model-router`.
- Every prompt lives in `agents/<name>/src/prompts/<name>_v<N>.ts`.
- Every AI call records `model`, `prompt_version`, `agent_version`, `latency_ms`.
- AI output that fails schema validation is **never** stored.
- AI **cannot** directly write to: `mastery_states`, `study_sessions`, `test_attempts`, `revision_items`, or any table that constitutes ground truth.

---

## 9. Event System

- Events are emitted using `EventBus` from `packages/events`.
- Every event must include `request_id`, `trace_id`, `correlation_id`, `schema_version`.
- Event consumers must be idempotent — processing the same event twice must be safe.
- New event types must be added to `packages/events/src/event-types.ts`.

---

## 10. Agent Contract

Every agent server must implement:
```
GET  /health
GET  /ready
GET  /version
POST /test
POST /run
```

Use the base implementation from `packages/agent-sdk`.

---

## 11. Testing

- Every exported function that contains business logic has a unit test.
- Every API route has an integration test.
- Every critical invariant (see `docs/REQUIREMENTS_MATRIX.md` INV-*) has a dedicated invariant test file.
- Tests live in `__tests__/` co-located with source.
- Test file naming: `<module>.spec.ts` for unit, `<module>.integration.spec.ts` for integration.
- No test should depend on real API keys or real Supabase — use MSW / vitest mocks.

---

## 12. Commits

- Commit messages follow Conventional Commits:
  ```
  feat(mastery): add weighted evidence calculation
  fix(revision): correct spaced-repetition interval overflow
  test(quiz): add schema validation invariant test
  docs(arch): update ERD with quota_events table
  ```
- Never commit `.env`, `node_modules`, `dist/`, `*.log`.
- Every commit must pass: `lint`, `typecheck`, `test:unit`.
- A phase-completing commit must also pass `test:integration` and `build`.

---

## 13. Security Checklist (per PR)

- [ ] No secrets committed
- [ ] New tables have RLS policies
- [ ] New API routes have auth middleware
- [ ] New AI outputs are schema-validated before storage
- [ ] No direct `SUPABASE_SERVICE_ROLE_KEY` usage in frontend code
- [ ] Environment variables documented in `docs/ENV_SPEC.md`
