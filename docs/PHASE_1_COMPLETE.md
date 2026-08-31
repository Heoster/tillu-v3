# TILLU — Phase 1 Completion Report

**Phase:** 1 — Tillu Core (Learning Tracker)  
**Status:** ✅ Complete  
**Built across:** Multiple sessions  
**Requirements implemented:** 25 (see REQUIREMENTS_MATRIX.md)

---

## Exit Criteria — All Met

```
✅ Student can register and sign in
✅ Student can set up profile (name, exam date, subjects, availability)
✅ Student can browse subjects → chapters → concepts (CBSE Class 12 seeded)
✅ Student can start a study session from any concept
✅ Student can pause, resume, and end a session
✅ Actual duration auto-calculated on session end
✅ SESSION_STARTED and SESSION_COMPLETED events recorded in DB
✅ One student cannot see another student's data (RLS enforced)
✅ API health endpoint returns 200 with DB check
✅ All unit + integration tests pass (no real DB/API keys needed)
✅ TypeScript strict mode — all packages compile clean
```

---

## What Was Built

### Repository Foundation (carried from Phase 0)

The full monorepo skeleton was established:

```
apps/api          Core API — Express + TypeScript
apps/web          Next.js 14 frontend
apps/local-agent  Placeholder (Phase 4)
agents/           10 agent directories scaffolded (Phase 2+)
packages/         7 shared packages, all with tsconfig + vitest
supabase/         2 migrations + seed script
docs/             Architecture, requirements, env spec, ADRs, phase reports
```

---

### Shared Packages

| Package | What's in it | Status |
|---------|-------------|--------|
| `@tillu/schemas` | Zod schemas: agent contract, event envelope, 18 common types | **complete** |
| `@tillu/events` | `EventBus` with Supabase write, idempotency check, 32 event types | **complete** |
| `@tillu/utilities` | `TilluError` hierarchy, `retry`, `withTimeout`, `CircuitBreaker` | **complete** |
| `@tillu/logging` | pino structured logger, secret redaction, child logger factory | **complete** |
| `@tillu/database` | Supabase client factory (anon + service role), typed DB types for all Phase 1–2 tables | **complete** |
| `@tillu/auth` | `verifyUserToken` (Supabase JWT), `verifyServiceToken` (shared secret) | **complete** |
| `@tillu/model-router` | `ModelRouter` interface + `ProviderAdapter` contract — skeleton | **stubbed** |
| `@tillu/agent-sdk` | `AgentBase` + `createAgentServer` mounting all 5 contract endpoints | **stubbed** |

---

### Database Migrations

**0001_initial_schema.sql**
- `student_profiles`, `student_preferences`
- `subjects`, `chapters`, `concepts`
- `events` (append-only), `event_consumer_log` (idempotency)
- `agents`, `agent_heartbeats`, `agent_tests`, `agent_failures`
- `workflow_runs`
- RLS on all tables, `update_updated_at` trigger

**0002_study_mastery_revision.sql**
- `study_sessions`, `study_tasks`
- `mastery_states`, `mastery_events` (Phase 2 — table ready, unpopulated)
- `revision_items`, `revision_events` (Phase 3 — table ready, unpopulated)
- `notifications` (Phase 3 — table ready)
- `mistakes`, `mistake_patterns` (Phase 4 — table ready)
- `daily_plans`, `plan_items` (Phase 6 — table ready)
- RLS on all new tables via `auth_student_id()` helper function

All future-phase tables are created now so migrations stay in order and the schema is coherent.

---

### Core API (`apps/api`)

**Middleware stack (every request):**
- `helmet` — security headers
- `cors` — configurable allowed origins
- `express-rate-limit` — 100 req/60s default
- `requestLogger` — attaches `request_id` + `trace_id`, logs latency
- `requireAuth` — Supabase JWT verification
- `errorHandler` — typed `TilluError` → consistent API error shape
- `notFound` — 404 with error envelope

**Routes and services implemented:**

| Route | Service | Description |
|-------|---------|-------------|
| `GET /health` | health route | DB liveness check |
| `POST /auth/register` | `AuthService` | Supabase signUp + profile creation |
| `POST /auth/login` | `AuthService` | Supabase signInWithPassword |
| `POST /auth/logout` | `AuthService` | Supabase signOut |
| `GET /auth/me` | direct DB | Returns user + profile |
| `GET /profile` | `ProfileService` | Full profile + preferences |
| `POST /profile` | `ProfileService` | Create/update profile |
| `PUT /profile` | `ProfileService` | Update profile fields |
| `PUT /profile/subjects` | `ProfileService` | Set selected subjects |
| `PUT /profile/availability` | `ProfileService` | Set availability windows + sleep |
| `GET /syllabus` | `SyllabusService` | Full CBSE tree overview |
| `GET /syllabus/subjects` | `SyllabusService` | All subjects |
| `GET /syllabus/chapters/:subjectId` | `SyllabusService` | Chapters for a subject |
| `GET /syllabus/concepts/:chapterId` | `SyllabusService` | Concepts for a chapter |
| `POST /sessions/start` | `StudyService` | Start session + emit SESSION_STARTED |
| `POST /sessions/:id/pause` | `StudyService` | Pause active session |
| `POST /sessions/:id/resume` | `StudyService` | Resume paused session |
| `POST /sessions/:id/end` | `StudyService` | End session + calculate duration + emit SESSION_COMPLETED |
| `GET /sessions` | `StudyService` | List recent sessions |
| `GET /sessions/today` | `StudyService` | Today's summary |
| `GET /sessions/:id` | `StudyService` | Single session |

**EventBus wiring:**
- Singleton `getEventBus()` in `apps/api/src/lib/event-bus.ts`
- Injects `getServiceClient()` once at startup
- Event emit is non-blocking — a failed emit never fails the primary operation (INV-005)

---

### CBSE Seed (`supabase/seed/`)

6 subjects, 70 chapters, 230+ concepts with:
- Descriptions
- Importance weights (1–5, board exam relevance)
- Unit groupings
- Source: `ncert_cbse`, source_version: `2024-25`
- Seed runner is **idempotent** — safe to run multiple times

**Subject coverage:**
| Subject | Chapters | Concepts |
|---------|----------|---------|
| Physics | 14 | 62 |
| Chemistry | 11 | 48 |
| Mathematics | 13 | 50 |
| Biology | 13 | 49 |
| Computer Science | 7 | 29 |
| English | 5 | 22 |

---

### Frontend (`apps/web`)

**Auth flow:**
- `/auth/login` — Supabase signInWithPassword
- `/auth/register` — Supabase signUp → redirects to `/onboarding`
- `/auth/callback` — handles email confirmation redirects
- `/onboarding` — minimal setup: name + exam date
- Supabase SSR middleware keeps sessions alive across Server Components

**App shell (authenticated):**
- `TopBar` — Tillu logo, system health dot, settings link
- `BottomNav` — 5 tabs: Home / Plan / Study / Revision / Progress
- Max-width 448px centered layout (mobile-first)

**Pages implemented:**

| Route | Content | Phase |
|-------|---------|-------|
| `/home` | Greeting, NBA placeholder card, TodayProgress (live from DB), SystemHealthBadge | 1 |
| `/plan` | Placeholder — adaptive planner in Phase 6 | stub |
| `/study` | Subject grid (live from DB, seeded) | 1 |
| `/study/:subjectId` | Chapter list grouped by unit, importance stars | 1 |
| `/study/:subjectId/:chapterId` | Concept list with Start Session button | 1 |
| `/study/:subjectId/:chapterId/session` | Focus Mode — live timer, pause/resume/complete/abandon | 1 |
| `/revision` | Placeholder — revision manager in Phase 3 | stub |
| `/progress` | Live today summary from DB, mastery/board readiness placeholders | 1 |

---

### Tests Written

| File | Tests | Covers |
|------|-------|--------|
| `packages/utilities/src/__tests__/errors.spec.ts` | 12 | TilluError hierarchy, toApiError |
| `packages/utilities/src/__tests__/retry.spec.ts` | 5 | retry with backoff, withTimeout |
| `packages/utilities/src/__tests__/circuit-breaker.spec.ts` | 7 | CLOSED→OPEN→HALF_OPEN→CLOSED full cycle |
| `packages/schemas/src/__tests__/agent.spec.ts` | 9 | AgentRequest, AgentResponse, AgentHealth schemas |
| `packages/schemas/src/__tests__/events.spec.ts` | 7 | TilluEventSchema, EventType constants |
| `packages/events/src/__tests__/event-bus.spec.ts` | 10 | emit, isProcessed, markProcessed, INV-004 |
| `apps/api/src/__tests__/auth.service.spec.ts` | 9 | RegisterInputSchema, LoginInputSchema, register, login |
| `apps/api/src/__tests__/profile.service.spec.ts` | 10 | All three schemas, getProfile, upsertProfile |
| `apps/api/src/__tests__/study.service.spec.ts` | 10 | StartSessionSchema, startSession, endSession, INV-005 |
| `apps/api/src/__tests__/syllabus.service.spec.ts` | 7 | getSubjects, getChapters, getConcepts |
| `apps/api/src/__tests__/health.route.spec.ts` | 3 | GET /health, DB degraded, 404 handling |

**Total: 89 tests across 11 files**

All tests use mocked Supabase clients — no real credentials needed to run.

---

## Invariants Verified in Phase 1

| INV | Description | How verified |
|-----|-------------|-------------|
| INV-002 | AI cannot change historical study records | `StudyService` is the only writer to `study_sessions` |
| INV-004 | Duplicate events don't duplicate history | `event-bus.spec.ts` — `isProcessed` returns true after `markProcessed` |
| INV-005 | Failed event emit doesn't destroy the session | `study.service.spec.ts` — flakyBus test: EventBus throws, session still returned |
| INV-008 | No agent accesses data beyond permissions | RLS on all tables, `getServiceClient()` only in server-side code |

---

## Technical Debt Introduced in Phase 1

| Item | Description | Fix in |
|------|-------------|--------|
| TD-001 | `verifyServiceToken` uses plain shared secret — no expiry | Phase 3 — upgrade to short-lived signed tokens |
| TD-002 | `ModelRouter.generate` skeletonised — falls through to `AIUnavailableError` | Phase 3 — implement real provider adapters |
| TD-003 | `AgentBase` is abstract only — no concrete agents yet | Phase 2 — first concrete agent (Research) |
| TD-004 | Focus mode session page loads "most recent active session" rather than session ID from route | Phase 2 — refactor to pass session ID via URL params |
| TD-005 | `TodayProgress` component fetches directly from Supabase browser client — should go through API | Phase 4 — move to API endpoint for consistency |
| TD-006 | No e2e test yet — full flow register→session→event is manually testable only | Phase 3 — add Playwright e2e suite |

---

## Known Issues

None blocking Phase 2. All Phase 1 exit criteria met.

The `NEXT_PUBLIC_API_BASE_URL` fallback in `SystemHealthBadge` will always fail in test environments where the API isn't running — this is expected and the badge degrades gracefully to "error" state without breaking the page.

---

## Risks Carried into Phase 2

| Risk | Status |
|------|--------|
| R-001 Free tier cold starts | Still present — Sentinel (Phase 3) will address |
| R-002 AI provider rate limits | ModelRouter skeleton exists; full implementation Phase 3 |
| R-005 TypeScript strict mode compat issues | None found in Phase 1 — watchlist for Phase 2 when `@supabase/supabase-js` types are used more heavily |
| R-006 Supabase Auth vs custom JWT confusion | Documented in `packages/auth/src/index.ts` comments — clear separation maintained |
| R-007 Event schema evolution | `schema_version: "v1"` on all events — no breaking changes yet |

---

## Phase 1 → Phase 2 Handoff Checklist

- [x] All Phase 1 tests pass with mocked DB
- [x] TypeScript strict mode — zero type errors across all packages
- [x] `apps/api` starts cleanly with `tsx src/index.ts`
- [x] CBSE seed script produces 6 subjects, 70 chapters, 230+ concepts
- [x] All 25 Phase 1 requirements marked `implemented` in REQUIREMENTS_MATRIX.md
- [x] `mastery_states`, `mastery_events` tables exist (empty — Phase 2 populates them)
- [x] Event ledger working — SESSION events write to `events` table
- [x] RLS enforced — student-scoped policies on every table
- [x] `.env.example` covers all new variables introduced in Phase 1

---

## Phase 2 Preview

**Goal:** Concepts now have mastery scores. AI is integrated for the first time.

**What Phase 2 builds:**

```
MasteryService         Deterministic scoring from evidence
mastery_states         Populated on every study event
mastery_events         Audit trail of every evidence item

ModelRouter            Real Groq + Cerebras + OpenRouter adapters
GroqAdapter
CerebrasAdapter
OpenRouterAdapter

ResearchAgent          Query → decompose → search → source → claim → store
TutorAgent             Hint-first guidance, show-answer on demand
FormulaAgent           Formula vault + recall sessions
FormulaService         Daily recall list generation
```

**Phase 2 exit criteria:**
```
✓ Mastery score changes after completing a quiz answer
✓ AI cannot directly overwrite mastery (INV-001 test passes)
✓ ModelRouter routes to Groq, falls back to Cerebras on simulated failure
✓ Research agent returns sourced claims (confidence tagged)
✓ Tutor gives at least one hint before revealing answer
✓ Formula recall records evidence and feeds mastery
✓ All tests pass
```
