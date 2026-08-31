# TILLU — Phase 0 Completion Report

**Phase:** 0 — Architecture & Repository Setup  
**Status:** ✅ Complete  
**Approved:** Yes — proceed to Phase 1  
**Date:** Phase 0

---

## What Was Built

Phase 0 established the complete foundation. Nothing in this phase is user-visible, but everything in Phases 1–7 depends on it.

### Repository Structure

A pnpm workspaces monorepo was created with the following structure:

```
apps/         web · api · local-agent
agents/       research · tutor · quiz · revision · planner · exam
              formula · mistake · presence · sentinel
packages/     schemas · events · logging · utilities
              model-router · agent-sdk · database · auth
workflows/    n8n/
supabase/     migrations/ · functions/ · seed/
docs/         Architecture · Requirements · Implementation Plan
              ENV Spec · Coding Standards · 6 ADRs
```

### Documentation Created

| File | Purpose |
|------|---------|
| `docs/REQUIREMENTS_MATRIX.md` | 80+ requirements mapped to component → DB → API → UI → test → status |
| `docs/IMPLEMENTATION_PLAN.md` | 7-phase build plan with exit criteria for each phase |
| `docs/ARCHITECTURE.md` | System diagram, full ERD, event architecture, agent contract, security, observability |
| `docs/ENV_SPEC.md` | Every environment variable documented with sensitivity level |
| `docs/ADR/ADR-001 to ADR-006` | 6 architecture decision records with reasons and tradeoffs |
| `CODING_STANDARDS.md` | TypeScript rules, naming, error handling, logging, DB, AI, testing, commit standards |
| `.env.example` | All vars with safe placeholder values |
| `.gitignore` | Covers node_modules, .env, dist, local-agent data, n8n data |

### Shared Packages Created (skeletons)

| Package | What it contains |
|---------|-----------------|
| `@tillu/schemas` | Zod schemas: agent contract envelopes, event envelope, common types (mastery score, presence state, error types, etc.) |
| `@tillu/events` | `EventBus` class (skeleton), `EventType` constants (32 event types) |
| `@tillu/logging` | pino structured logger with redaction rules for secrets |
| `@tillu/utilities` | `TilluError` class hierarchy, `retry` with exponential backoff, `withTimeout`, `CircuitBreaker` state machine |
| `@tillu/model-router` | `ModelRouter` with provider selection, output validation, fallback chain (skeleton — full impl in Phase 3) |
| `@tillu/agent-sdk` | `AgentBase` abstract class, `createAgentServer()` mounting all 5 contract endpoints |

### Database

Migration `0001_initial_schema.sql` creates:
- `student_profiles`, `student_preferences`
- `subjects`, `chapters`, `concepts`
- `events` (append-only ledger), `event_consumer_log` (idempotency)
- `agents`, `agent_heartbeats`, `agent_tests`, `agent_failures`
- `workflow_runs`
- RLS policies on all tables
- `update_updated_at` trigger function

### Architecture Decisions Made

1. **Monorepo (pnpm workspaces)** — shared packages without publishing overhead
2. **Supabase** — free tier, built-in auth, RLS, standard PostgreSQL
3. **Deterministic mastery** — `MasteryService` owns all score computation; AI never writes final mastery (INV-001)
4. **ModelRouter abstraction** — no direct provider calls in any agent
5. **Append-only event ledger** — audit trail, idempotency, replay capability
6. **Free-tier by failure domain** — 5 failure domains instead of 10 separate hosts

---

## Critical Invariants Established

These must remain true forever. Tests for each exist in the requirements matrix.

| ID | Invariant |
|----|-----------|
| INV-001 | AI cannot directly modify marks or mastery scores |
| INV-002 | AI cannot directly change historical study records |
| INV-003 | Revision scheduling must be reproducible from stored state |
| INV-004 | Duplicate events must not duplicate study history |
| INV-005 | A failed AI provider must not destroy a workflow |
| INV-006 | The local agent must always be disableable |
| INV-007 | The student can override any automated plan |
| INV-008 | No agent accesses data beyond its permissions |
| INV-009 | Presence inference is never represented as certainty |
| INV-010 | No autonomous workflow creates an unbounded task loop |

---

## Risks Identified in Phase 0

### R-001 — Free Tier Cold Starts (HIGH probability, MEDIUM impact)
**Problem:** Render free-tier services sleep after 15 minutes of inactivity. First request after sleep can take 30–60 seconds.  
**Current mitigation:** Local agent handles time-critical operations (lecture playback, presence).  
**Future resolution (Phase 3):** Sentinel warms agents by pinging `/health` during active study windows. Stagger wake-up pings to avoid simultaneous cold starts.  
**Phase to fix:** Phase 3 (Sentinel)

---

### R-002 — AI Provider Rate Limits (HIGH probability, HIGH impact)
**Problem:** Groq free tier: ~14,400 req/day, 6K tokens/min. Cerebras: variable. These limits change without notice.  
**Current mitigation:** ModelRouter skeleton with fallback chain built. CircuitBreaker in `@tillu/utilities`.  
**Future resolution (Phase 3):** Quota Guardian tracks usage per provider. CONSERVE mode at 75%, EMERGENCY mode at 90%. Deterministic fallbacks for every AI-powered feature.  
**Phase to fix:** Phase 3 (Model Router full + Quota Guardian)

---

### R-003 — Supabase 500MB Storage Limit (LOW probability, LOW impact)
**Problem:** Free tier has 500MB. CBSE seed is ~5MB. Events for one student ~50MB/year.  
**Current mitigation:** Single student target. Append-only events but low volume.  
**Future resolution:** Add event archiving job if approaching limit. Content (research claims, question text) can be paginated or summarized.  
**Phase to fix:** Phase 6 (n8n maintenance workflows)

---

### R-004 — n8n Free Cloud Tier Limits (MEDIUM probability, HIGH impact)
**Problem:** n8n Cloud free tier allows ~5 workflows and 20 executions/day — not enough for the full daily intelligence cycle.  
**Current mitigation:** n8n not yet wired in.  
**Recommended resolution:** Self-host n8n locally alongside the local agent (runs on the student's computer, no execution limits, no cost). Cloud n8n is a backup.  
**Phase to fix:** Phase 5 (n8n integration)

---

### R-005 — TypeScript Strict Mode Breaking Changes (LOW probability, MEDIUM impact)
**Problem:** `exactOptionalPropertyTypes: true` and `noUncheckedIndexedAccess: true` are stricter than most tutorials assume. Third-party types may not be fully compatible.  
**Current mitigation:** `skipLibCheck: true` in tsconfig.  
**Future resolution:** Fix type issues per package; do not downgrade strictness.  
**Phase to fix:** Ongoing from Phase 1

---

### R-006 — Supabase Auth vs Custom JWT (MEDIUM probability, MEDIUM impact)
**Problem:** Supabase Auth issues its own JWTs. The API also needs internal service-to-service auth tokens. These two token types must not be confused.  
**Current mitigation:** Documented in ENV_SPEC (SUPABASE_ANON_KEY vs SUPABASE_SERVICE_ROLE_KEY vs JWT_SECRET).  
**Future resolution (Phase 1):** `packages/auth` implements clear separation: `verifySupabaseToken()` for user requests, `verifyServiceToken()` for agent-to-agent calls.  
**Phase to fix:** Phase 1 (packages/auth)

---

### R-007 — Event Schema Evolution (LOW probability, HIGH impact)
**Problem:** Events are stored forever (append-only). If the payload schema changes, old events become hard to process.  
**Current mitigation:** `schema_version` field on every event ("v1").  
**Future resolution:** When schema changes, bump to "v2" and write a migration handler. Event processors check schema_version before processing.  
**Phase to fix:** Ongoing — discipline required from Phase 1

---

### R-008 — AI Output Hallucination in Academic Content (MEDIUM probability, HIGH impact)
**Problem:** LLMs can generate incorrect physics formulas, wrong chemistry reactions, or fabricated board exam patterns.  
**Current mitigation:** ADR-003 (AI cannot write ground truth). Research claims have confidence levels.  
**Future resolution (Phase 2+):** All AI-generated academic content is flagged as `source: 'ai_generated'`. Students see confidence indicators. Research agent cross-checks claims against multiple sources.  
**Phase to fix:** Phase 2 (Research Agent)

---

### R-009 — Local Agent Security Surface (LOW probability, HIGH impact)
**Problem:** Local agent runs on the student's computer with Playwright + Chromium. If the allowed-domains list or action scope is too broad, it could be misused.  
**Current mitigation:** `LOCAL_AGENT_ALLOWED_DOMAINS` env var. Emergency stop endpoint documented.  
**Future resolution (Phase 4):** Local agent enforces domain allowlist at the Playwright level, not just config. All browser actions are logged. Emergency stop kills all browser processes.  
**Phase to fix:** Phase 4 (Local Agent)

---

### R-010 — Package Circular Dependencies (LOW probability, MEDIUM impact)
**Problem:** In a monorepo with many shared packages, circular dependencies (`a → b → a`) are easy to introduce accidentally and cause runtime failures.  
**Current mitigation:** Dependency direction enforced: `apps/* → packages/*`; `agents/* → packages/*`; no cross-package cycles.  
**Future resolution:** Add `eslint-plugin-import` with `no-cycle` rule to CI. Run `madge --circular` as part of typecheck step.  
**Phase to fix:** Phase 1 CI setup

---

## Notes for Phase 1

1. **Start with `packages/database` and `packages/auth`** before building any routes — every service depends on these.
2. **EventBus needs the Supabase client injected** — wire this in `apps/api/src/services/` as a singleton, not scattered construction.
3. **CBSE seed script** — seed data for Physics, Chemistry, Mathematics, Biology/CS, English. Keep it simple: ~5 subjects, ~30 chapters, ~150 concepts. Enough to make the app feel real.
4. **RLS verification** — after every migration, write a test that confirms a student cannot read another student's data using the anon key.
5. **Do not build the full dashboard UI yet** — Phase 1 UI is minimal: auth screens + subject list + session start/end. The smart home screen comes in Phase 7.

---

## Phase 0 → Phase 1 Handoff Checklist

- [x] Repository structure created and committed
- [x] All shared packages have `package.json` and entry `src/index.ts`
- [x] `@tillu/schemas` exports agent contract + event + common schemas
- [x] `@tillu/utilities` exports TilluError, retry, CircuitBreaker
- [x] `@tillu/logging` exports pino-based structured logger
- [x] `@tillu/model-router` skeleton with ProviderAdapter interface
- [x] `@tillu/agent-sdk` skeleton with AgentBase and createAgentServer
- [x] Migration 0001 creates core identity + academic graph + event ledger + agent registry
- [x] All tables have RLS enabled
- [x] `.env.example` documents all variables
- [x] `CODING_STANDARDS.md` established
- [x] 6 ADRs written and justified
- [x] Requirements matrix has 80+ requirements all in `planned` state
- [x] Implementation plan has 7 phases with exit criteria
- [ ] Phase 1 builds on top of this — see `docs/IMPLEMENTATION_PLAN.md`

---

## Phase 1 Preview

**Goal:** A working, testable study tracker.

**Exit criteria:**
```
✓ Student can register and sign in
✓ Student can set up profile (subjects, exam dates, availability)
✓ Student can browse subjects → chapters → concepts (CBSE seeded)
✓ Student can start and end a study session
✓ SESSION_STARTED and SESSION_COMPLETED events recorded in DB
✓ One student cannot see another student's data (RLS test)
✓ All unit + integration tests pass
✓ TypeScript compiles clean
✓ API health endpoint returns 200
```

**What Phase 1 does NOT include:**
- Mastery scores (Phase 2)
- Revision scheduling (Phase 3)
- AI agents (Phase 2+)
- Smart home screen / NBA (Phase 7)
- Quizzes (Phase 5)
- n8n automation (Phase 5)
