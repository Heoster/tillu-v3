# TILLU — Phase 2 Completion Report

**Phase:** 2 — Mastery Engine + AI Integration  
**Status:** ✅ Complete  
**Requirements implemented:** 22  
**Total tests (Phase 2 additions):** 50 across 5 files  
**Cumulative tests to date:** 139

---

## Exit Criteria — All Met

```
✅ Mastery score changes after adding evidence (quiz answer, recall, PYQ)
✅ AI cannot directly overwrite mastery — INV-001 assertNotAiDirectWrite throws InvariantViolationError
✅ Mastery algorithm versioned (v1), stored on every row
✅ MASTERY_UPDATED event emitted on every change
✅ Failed EventBus emit never fails the primary mastery update — INV-005
✅ ModelRouter routes to Groq first, falls back to Cerebras, then OpenRouter, then HF
✅ All providers unavailable → AIUnavailableError thrown (not a crash)
✅ AI output validated by Zod schema before storage — invalid output retried then falls back
✅ ResearchAgent stores claims with confidence levels (HIGH/MEDIUM/LOW/UNVERIFIED)
✅ UNVERIFIED claims preserved and never silently promoted
✅ TutorAgent gives hint by default; reveal only on explicit request
✅ TutorAgent has deterministic fallback when all AI providers fail
✅ Formula vault seeded (24 formulas across Physics, Chemistry, Mathematics)
✅ Formula recall records evidence with SRS intervals (recalled=48h, partial=12h, failed=4h)
✅ Daily recall list shows only overdue/never-reviewed formulas
✅ All unit tests pass with mocked clients — no real API keys required
```

---

## What Was Built

### Mastery Engine

**`apps/api/src/services/mastery.service.ts`**

The most critical deterministic component of Tillu. Implements:

- Exponential Moving Average (EMA, α=0.4) per evidence type
- Weighted overall score: recall 30%, practice 25%, PYQ 25%, exam 20%
- Forgetting risk calculation (mastery factor + recency factor + failure factor)
- Next review scheduling (4h minimum on failure, up to 48h on high mastery)
- Confidence scoring (scales with attempt count and success rate)
- Full audit trail via `mastery_events` (every evidence item recorded)
- `MASTERY_ALGORITHM_VERSION = "v1"` — stored on every row for reproducibility
- `assertNotAiDirectWrite()` — static INV-001 guard, throws `InvariantViolationError` if bypass attempted

**`apps/api/src/routes/mastery.ts`**

| Route | Description |
|-------|-------------|
| `GET /mastery/:conceptId` | Full breakdown with explanation |
| `GET /mastery/chapter/:chapterId` | Mastery map for all concepts in a chapter |
| `GET /mastery/radar` | Top concepts by forgetting risk |
| `POST /mastery/evidence` | Add evidence → recalculate → emit event |

INV-001 guard applied at the route level before the service is called.

---

### Model Router — Real Adapters

**`packages/model-router/src/adapters/`**

Four concrete adapters, all implementing `ProviderAdapter`:

| Adapter | Provider | Priority | Free-tier notes |
|---------|---------|---------|----------------|
| `GroqAdapter` | Groq | 1 (primary) | llama-3.3-70b-versatile, ~14.4K req/day |
| `CerebrasAdapter` | Cerebras | 2 | llama3.3-70b, ultra-fast inference |
| `OpenRouterAdapter` | OpenRouter | 3 | meta-llama/llama-3.3-70b-instruct:free |
| `HFAdapter` | Hugging Face | 4 (last resort) | Mistral-7B, slower, longer cooldown |

Each adapter:
- Uses `CircuitBreaker` from `@tillu/utilities`
- Uses `AbortController` for timeout
- Sends `response_format: { type: "json_object" }` for structured output
- Logs every call with model, latency, token count
- Exposes `getStatus()` for Sentinel health checks (Phase 3)

**`packages/model-router/src/factory.ts`**

`createDefaultRouter()` — builds router from whichever API keys are set in env.  
`getModelRouter()` — singleton for API process.

**`ModelRouter.generate()`** fully implemented:
- Sorts providers by priority
- Skips OPEN circuit-broken providers
- Retries (up to 2x per provider) with `retry()` from `@tillu/utilities`
- Validates output against caller-supplied Zod schema
- Extracts JSON from markdown code blocks if needed
- Falls back to next provider on validation failure or network error
- Throws `AIUnavailableError` only when all providers exhausted

---

### Research Agent

**`agents/research/`**

Pipeline: validate → create DB row → ModelRouter (Groq) → Zod validate → store sources + claims → mark completed

Key design decisions:
- Every claim has a mandatory `confidence` field: `HIGH | MEDIUM | LOW | UNVERIFIED`
- `UNVERIFIED` = AI training data with no verifiable source — never silently upgraded
- Query marked `status: failed` if all providers fail — no silent data loss
- Sources stored in `research_sources` for future provenance UI
- `syntheticTest()` runs a real Ohm's Law query for Sentinel

---

### Tutor Agent

**`agents/tutor/`**

Four actions mapped to four prompt strategies:

| Action | Prompt Strategy | When used |
|--------|----------------|-----------|
| `hint` | Hint only — no answer | Default, every question |
| `explain` | Evaluate student attempt, show correct method | After student tries |
| `reveal` | Full step-by-step answer | Student explicitly requests |
| `similar` | Generate equivalent practice question | After explanation |

Deterministic fallback for every action when AI is unavailable — Tillu never crashes the tutor screen.

---

### Formula Manager

**`apps/api/src/services/formula.service.ts`** + **`apps/api/src/routes/formula.ts`**

Key operations:
- `getDailyRecallList()` — combines overdue reviews + never-reviewed formulas, ordered by importance
- `submitRecall()` — records outcome with SRS intervals, computes next review date
- `getRecallStats()` — recalled/partial/failed counts from latest-per-formula reviews

**`supabase/seed/formula_seed.ts`** — 24 key formulas:
- Physics (12): Lens, Mirror, Snell, Coulomb, Ohm, Faraday, Photoelectric, de Broglie, Decay Law, Half-life, LCR Impedance, Bohr Radius
- Chemistry (7): Nernst, Arrhenius, van't Hoff, Rate Law, First-order Half-life, Raoult's, Faraday's First Law
- Mathematics (5): Integration by Parts, Bayes', Binomial Distribution, Distance Point-Plane, Lagrange's MVT

**Migration 0003** adds: `formulas`, `formula_reviews`, `questions`, `research_queries`, `research_sources`, `research_claims` with RLS on all.

---

## Tests Added in Phase 2

| File | Tests | Coverage |
|------|-------|---------|
| `apps/api/src/__tests__/mastery.service.spec.ts` | 14 | INV-001 guard (4 tests), addEvidence (5 tests), getMastery (2 tests), score bounds (2 tests), INV-005 non-blocking (1 test) |
| `packages/model-router/src/__tests__/router.spec.ts` | 10 | Constructor, happy path, priority ordering, fallback chain, all-fail, unavailable skip, schema validation, markdown extraction |
| `apps/api/src/__tests__/formula.service.spec.ts` | 10 | SubmitRecallSchema, recall intervals (recalled/failed), NOT_FOUND, daily list exclusion, recall stats |
| `agents/research/src/__tests__/schemas.spec.ts` | 10 | Claim confidence levels, output schema, UNVERIFIED invariant, request validation |
| `agents/tutor/src/__tests__/schemas.spec.ts` | 9 | Request actions, output modes, SimilarQuestion validation |

**Phase 2 additions: 53 tests**

---

## Invariants Verified in Phase 2

| INV | Description | Where tested |
|-----|-------------|-------------|
| INV-001 | AI cannot directly set mastery_score | `mastery.service.spec.ts` — 4 dedicated invariant tests |
| INV-005 | Failed event emit never destroys primary operation | `mastery.service.spec.ts` — flakyBus test |

INV-001 is now enforced at two levels:
1. `MasteryService.assertNotAiDirectWrite()` — throws `InvariantViolationError` on direct score bypass
2. Route guard in `POST /mastery/evidence` — runs before service call

---

## Technical Debt Introduced in Phase 2

| ID | Description | Fix in |
|----|-------------|--------|
| TD-007 | Research agent stores empty URL for sources (no web search yet) | Phase 4 — add real web search via SerpAPI or similar |
| TD-008 | HFAdapter prompt format is basic (not chat-native) — may produce less coherent JSON | Phase 3 — add proper instruct template for HF models |
| TD-009 | `getModelRouter()` singleton created lazily — if no keys set, app crashes on first AI call | Phase 3 — add startup key validation with clear error message |
| TD-010 | Formula seed doesn't link formulas to their specific concepts (concept_id is null) | Phase 4 — match formula names to seeded concepts by chapter |

---

## New API Routes Summary

| Route | Auth | Description |
|-------|------|-------------|
| `GET /mastery/:conceptId` | ✅ JWT | Mastery breakdown for one concept |
| `GET /mastery/chapter/:chapterId` | ✅ JWT | Mastery map for chapter |
| `GET /mastery/radar` | ✅ JWT | Forgetting radar (top risk concepts) |
| `POST /mastery/evidence` | ✅ JWT | Add evidence, recalculate mastery |
| `GET /formulas/daily` | ✅ JWT | Today's recall list |
| `GET /formulas/stats` | ✅ JWT | Recall statistics |
| `GET /formulas/subject/:id` | ✅ JWT | All formulas for a subject |
| `GET /formulas/:id` | ✅ JWT | Single formula |
| `GET /formulas/:id/history` | ✅ JWT | Recall history for a formula |
| `POST /formulas/:id/recall` | ✅ JWT | Submit recall outcome |

---

## Risks Carried into Phase 3

| Risk | Update |
|------|--------|
| R-001 Cold starts | Sentinel (Phase 3) will warm agents during active windows |
| R-002 AI rate limits | Quota Guardian (Phase 3) will track usage and switch modes |
| TD-009 No-key startup crash | Fix in Phase 3 with startup validation |

---

## Phase 2 → Phase 3 Handoff Checklist

- [x] `mastery_states` and `mastery_events` tables exist and have RLS
- [x] `MasteryService.addEvidence()` is the sole writer of mastery data
- [x] INV-001 guard implemented and tested
- [x] `ModelRouter` has real adapters — all agents can make AI calls
- [x] `ResearchAgent` and `TutorAgent` implement agent contract (GET /health /ready /version, POST /test /run)
- [x] Formula vault seeded, recall sessions working
- [x] `revision_items` and `revision_events` tables exist (created in migration 0002) — Phase 3 populates them
- [x] All Phase 2 requirements marked `implemented` in REQUIREMENTS_MATRIX.md
- [x] 53 new tests, all passing with mocked clients

---

## Phase 3 Preview

**Goal:** The system now monitors its own health and remembers what the student is forgetting.

**Phase 3 builds:**
```
RevisionService        Adaptive spaced-repetition scheduling
                       Forgetting risk → revision priority
                       REVISION_SCHEDULED / DUE / COMPLETED / FAILED events
                       INV-003: reproducible from stored state

SentinelService        Agent heartbeat polling
                       Health score calculation
                       Synthetic test runner
                       AGENT_HEALTH_CHANGED event

NotificationService    Event → importance → presence → quiet hours → dedupe → send
                       Deduplication by composite key

QuotaGuardian          Token + API call tracking
                       NORMAL → CONSERVE → EMERGENCY mode transitions
                       Emergency mode: reduce AI, use deterministic fallbacks
```

**Phase 3 exit criteria:**
```
✓ Revision automatically scheduled after concept exposure
✓ Recall success/failure updates next review date
✓ Forgetting radar populated with real data
✓ INV-003: RevisionService output reproducible from stored revision_events
✓ Sentinel detects a simulated agent failure within 2 poll cycles
✓ Sentinel health score calculation correct (liveness/correctness/reliability/latency)
✓ Notification deduplication: same event + same day = single notification
✓ QuotaGuardian transitions NORMAL → CONSERVE at 75% usage
✓ All tests pass
```
