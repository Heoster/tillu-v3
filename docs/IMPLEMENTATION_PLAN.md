# TILLU — Implementation Plan

> Version: v1.0  
> Last updated: Phase 0  
> Build strategy: incremental vertical slices, each phase leaves Tillu in a runnable and testable state.

---

## Guiding Constraint

> Every phase must end with a **working, tested, deployable slice**.  
> No phase ends with scaffolding only.

Priority order for every technical decision:

```
Correctness > Learning value > Reliability > Maintainability > Security > Cost > Performance > Feature count
```

---

## Phase 0 — Architecture & Repository Setup ← YOU ARE HERE

**Goal:** Establish the foundation that every subsequent phase builds on.

**Deliverables:**

- [x] Monorepo directory structure (`apps/`, `agents/`, `packages/`, `workflows/`, `supabase/`, `docs/`)
- [x] `docs/REQUIREMENTS_MATRIX.md`
- [x] `docs/IMPLEMENTATION_PLAN.md`
- [x] `docs/ARCHITECTURE.md`
- [x] `docs/ENV_SPEC.md`
- [x] Root `package.json` (pnpm workspaces)
- [x] Root `tsconfig.json` (strict mode)
- [x] `.gitignore`, `.env.example`
- [x] `CODING_STANDARDS.md`
- [ ] `packages/schemas` — shared Zod schemas skeleton
- [ ] `packages/events` — event type definitions
- [ ] `packages/logging` — structured logger

**Exit criteria:** Repository clones, TypeScript compiles, base packages resolve.

---

## Phase 1 — Tillu Core (Learning Tracker)

**Goal:** A working study tracker. The student can sign in, navigate subjects, start sessions, answer questions, and see basic data.

**Duration estimate:** 2–3 weeks

### 1.1 — Authentication

- Supabase Auth integration
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- JWT middleware on all API routes
- RLS policies on all tables
- Test: `auth.spec.ts`

### 1.2 — Student Profile & Onboarding

- Onboarding flow: Class 12 → CBSE → select subjects → exam dates → availability
- `student_profiles`, `student_preferences` tables
- `ProfileService`
- Test: `profile.spec.ts`

### 1.3 — Academic Graph (Syllabus)

- Seed script: CBSE Class 12 subjects, chapters, concepts
- `subjects`, `chapters`, `concepts` tables
- `SyllabusService`
- `GET /syllabus`, `GET /subjects`, `GET /chapters/:subject_id`, `GET /concepts/:chapter_id`
- Test: `syllabus.spec.ts`

### 1.4 — Study Sessions

- `StudyService`: start, pause, resume, end session
- `study_sessions`, `study_tasks` tables
- Events: `SESSION_STARTED`, `SESSION_COMPLETED`
- Test: `study.spec.ts`

### 1.5 — Event System (Core)

- `EventBus` in `packages/events`
- Append-only `events` table in Supabase
- Idempotency via `(event_id, consumer_id)` key
- Test: `events.spec.ts`

### 1.6 — Basic Dashboard

- Home screen: subject list, today's sessions, empty NBA card
- Plan screen: manual task creation (no AI yet)
- Test: UI smoke tests

**Phase 1 exit checkpoint:**
```
✓ Sign in
✓ See subjects/chapters/concepts
✓ Start study session
✓ End study session
✓ Events recorded in DB
✓ All tests pass
✓ TypeScript compiles clean
```

---

## Phase 2 — Mastery Engine + Research + Tutor + Formula

**Goal:** Concepts now have mastery scores that change based on evidence. Research and tutor are first AI integrations.

**Duration estimate:** 2–3 weeks

### 2.1 — Mastery Engine

- `mastery_states`, `mastery_events` tables
- `MasteryService`: deterministic weighted scoring
- `mastery_algorithm_version` field
- AI **cannot** directly write mastery — only `MasteryService`
- Event: `MASTERY_UPDATED`
- Test: `mastery.spec.ts`, `mastery-invariants.spec.ts`

### 2.2 — Model Router (foundations)

- `packages/model-router`
- Provider adapters: `GroqAdapter`, `CerebrasAdapter`, `OpenRouterAdapter`, `HFAdapter`
- Fallback chain, retry, timeout, circuit breaker (basic)
- Test: `model-router.spec.ts`

### 2.3 — Research Agent

- `agents/research`
- Query decomposition → parallel search → source collection → synthesis
- `research_queries`, `research_sources`, `research_claims` tables
- Every claim linked to a source + confidence
- Test: `research.spec.ts`, `research-invariants.spec.ts`

### 2.4 — Tutor Agent

- `agents/tutor`
- Hint-first sequence before revealing answer
- Explicit "show answer" endpoint
- Suggest similar question after explanation
- Test: `tutor.spec.ts`

### 2.5 — Formula Manager

- `formulas` table seeded per subject
- `FormulaAgent`: recall mode (student produces formula, not just views it)
- `formula_reviews` table
- Daily recall list generated
- Test: `formula.spec.ts`

**Phase 2 exit checkpoint:**
```
✓ Mastery score changes from quiz answer
✓ AI cannot directly overwrite mastery (invariant test)
✓ ModelRouter routes to Groq, falls back to Cerebras
✓ Research agent returns sourced claims
✓ Tutor gives hints before answer
✓ Formula recall records evidence
✓ All tests pass
```

---

## Phase 3 — Revision Manager + Sentinel + Model Router (full)

**Goal:** The system now actively tracks what the student is forgetting and monitors its own health.

**Duration estimate:** 2 weeks

### 3.1 — Revision Manager

- `revision_items`, `revision_events` tables
- `RevisionService`: spaced-repetition scheduling (adaptive algorithm v1)
- `revision_algorithm_version` field
- Forgetting risk calculation
- Events: `REVISION_DUE`, `REVISION_COMPLETED`, `REVISION_FAILED`
- Revision types: recall, formula, reaction, flashcard, concept_explanation, question, pyq, mixed
- Test: `revision.spec.ts`, `revision-invariants.spec.ts`

### 3.2 — Forgetting Radar

- `GET /revision/radar` → concepts ranked by forgetting risk
- Risk formula: `importance × forgetting_risk × weakness × exam_relevance`
- Test: `revision.spec.ts`

### 3.3 — Sentinel (Basic)

- `agents/sentinel`
- Polls all agent `/health` and `/ready` endpoints
- `agent_heartbeats`, `agent_tests`, `agent_failures` tables
- Health score calculation (liveness 30%, correctness 40%, reliability 20%, latency 10%)
- Synthetic test runner
- Test: `sentinel.spec.ts`

### 3.4 — Quota Guardian

- `packages/quota-guardian`
- Token + API call tracking
- NORMAL / CONSERVE / EMERGENCY states
- Test: `quota.spec.ts`

### 3.5 — Notifications (Core)

- `NotificationService`
- Pipeline: event → importance → presence → quiet hours → dedupe → send
- Deduplicate key: `event_type:entity_id:date`
- `notifications` table
- Test: `notifications.spec.ts`

### 3.6 — Model Router (full)

- Circuit breaker per provider (OPEN / HALF_OPEN / CLOSED)
- Rate limit awareness
- Token tracking
- Test: `circuit-breaker.spec.ts`, `fallback.spec.ts`

**Phase 3 exit checkpoint:**
```
✓ Revision automatically scheduled after concept exposure
✓ Recall success/failure updates next review date
✓ Forgetting radar shows correct risk ranking
✓ Sentinel detects a simulated agent failure
✓ Circuit breaker opens after repeated provider failure
✓ Quota guardian transitions NORMAL → CONSERVE correctly
✓ All tests pass
```

---

## Phase 4 — Mistake Intelligence + Presence + Lectures

**Goal:** The system now learns from mistakes and knows when the student is available.

**Duration estimate:** 2 weeks

### 4.1 — Mistake Bank

- `mistakes`, `mistake_patterns` tables
- `MistakeService`: classify by error type, link to concept + question
- Pattern detection: 3+ mistakes on same concept + type = pattern
- Events: `MISTAKE_CREATED`, `MISTAKE_PATTERN_DETECTED`
- Test: `mistakes.spec.ts`

### 4.2 — Repair Sessions

- `RepairService`: micro-lesson → easy Q → medium Q → PYQ → delayed recall
- Mastery updated only after successful repair
- Test: `mistakes.spec.ts`

### 4.3 — Presence Engine

- `agents/presence`
- State machine: UNKNOWN → AVAILABLE / STUDYING / AWAY / SLEEPING / OFFLINE
- Presence includes confidence (never certainty)
- Signals: web session, local agent heartbeat, study session, explicit status
- `presence_events`, `presence_state` tables
- Test: `presence.spec.ts`, `presence-invariants.spec.ts`

### 4.4 — Lecture Player (Local Agent)

- `apps/local-agent`
- Playwright + Chromium, approved domains only
- `playlists`, `lectures`, `lecture_progress` tables
- Resume from last position
- Emergency stop API
- Events: `LECTURE_STARTED`, `LECTURE_COMPLETED`
- Post-lecture: 3–5 recall questions triggered
- Test: `lecture.spec.ts`, `local-agent.spec.ts`

**Phase 4 exit checkpoint:**
```
✓ Wrong answer creates classified mistake
✓ 3 mistakes on same concept triggers pattern + repair session
✓ Presence shows STUDYING during lecture
✓ Lecture progress persists and resumes
✓ LECTURE_COMPLETED triggers recall questions
✓ Local agent stops on emergency stop command
✓ All tests pass
```

---

## Phase 5 — Quiz Engine

**Goal:** Automatic daily quizzes, schema-validated AI output, full quiz→mistake→mastery→revision chain.

**Duration estimate:** 1–2 weeks

### 5.1 — Quiz Engine

- `agents/quiz`
- Generation parameters: subject, concept, difficulty, weakness, mistake history, exam relevance
- 7 quiz modes
- All AI output validated by Zod schema before storage
- Invalid output: retry → fallback model → deterministic fallback
- `quizzes`, `quiz_attempts` tables
- Events: `QUIZ_CREATED`, `QUIZ_COMPLETED`
- Test: `quiz.spec.ts`, `quiz-validation.spec.ts`

### 5.2 — Quiz → Chain Integration

- E2E: quiz answer → mistake → mastery update → revision rescheduled
- Test: `quiz-e2e.spec.ts`

### 5.3 — n8n Daily Quiz Workflow

- n8n workflow: 06:35 → fetch student state → generate daily quiz → store → notify
- Idempotent (double-trigger safe)
- Test: `n8n-quiz.spec.ts`

**Phase 5 exit checkpoint:**
```
✓ Daily quiz auto-generated
✓ Malformed AI output caught and retried
✓ Schema validation rejects bad AI output
✓ Quiz result → mastery changes → revision updated (E2E)
✓ All tests pass
```

---

## Phase 6 — Adaptive Planner

**Goal:** The system now generates and adapts daily plans automatically.

**Duration estimate:** 1–2 weeks

### 6.1 — Planner Agent

- `agents/planner`
- Inputs: student state, available time, fixed commitments, deadlines, mastery, revision, mistakes, recent performance
- Outputs: `daily_plans`, `plan_items`
- Hard constraint enforcement: total_scheduled ≤ available_time
- Events: `PLAN_CREATED`, `PLAN_CHANGED`, `TASK_COMPLETED`, `TASK_SKIPPED`
- Test: `planner.spec.ts`, `planner-invariants.spec.ts`

### 6.2 — Recovery Planner

- Missed task → evaluate importance → recalculate → protect high-priority → reschedule/merge/drop
- Replanning threshold to prevent churn
- Never creates unbounded backlog
- Test: `planner.spec.ts`

### 6.3 — Opportunistic Study Engine

- 5 / 10 / 15 / 30 / 60-minute opportunity detection
- Task candidate ranking for each window
- `GET /plan/opportunity`
- Test: `planner.spec.ts`

### 6.4 — n8n Morning + Evening Workflows

- Morning (06:30): fetch state → revision → deadlines → generate plan → quiz → formula recall → notify
- Evening (21:30): aggregate day → update mastery → update mistakes → plan tomorrow
- Test: `n8n-morning.spec.ts`, `n8n-evening.spec.ts`

**Phase 6 exit checkpoint:**
```
✓ Daily plan generated with correct time constraints
✓ Plan never exceeds available time (invariant test)
✓ Missed task triggers replanning, not failure message
✓ Opportunistic tasks appear for 10-minute windows
✓ n8n morning workflow runs idempotently
✓ All tests pass
```

---

## Phase 7 — Next Best Action (Home Screen Intelligence)

**Goal:** The home screen is now fully intelligent. Tillu can answer "What should I do right now?"

**Duration estimate:** 1 week

### 7.1 — NBA Engine

- `NBAEngine` as a domain service in `apps/api`
- Inputs: time, presence, mastery, revision urgency, mistakes, exam importance, available_duration
- Output: `{ task, reason[], duration, confidence }`
- Updates when student context changes
- Test: `nba.spec.ts`

### 7.2 — Home Screen

- Next Best Action card with reason tags (weak / revision due / recent mistakes)
- Today's progress (study time, revision, quiz)
- Forgetting Radar preview
- System health indicator
- Test: UI integration tests

**Phase 7 exit checkpoint:**
```
✓ Home screen shows NBA with reasons
✓ NBA changes after completing a task
✓ NBA changes after presence state changes
✓ Full learning loop E2E: sign in → start session → answer question → mistake → mastery → revision → NBA updates
✓ All tests pass
```

---

## Post-MVP Phases (V2)

These are planned but NOT scheduled until Phase 7 is stable.

| Phase | Feature | Priority |
|-------|---------|----------|
| 8 | Exam Engine (chapter test, mock, PYQ mode, answer writing evaluator) | P1 |
| 9 | Full n8n autonomous cycles (daily intelligence, weekly report) | P1 |
| 10 | Advanced Sentinel (rollback, self-healing, incident timeline) | P1 |
| 11 | Learning Scientist (predictive mastery, exam readiness forecast) | P2 |
| 12 | Personalized Model Routing (per-student model preferences) | P2 |
| 13 | Board Readiness Dashboard (syllabus coverage, PYQ accuracy, exam execution) | P2 |

---

## Cross-Cutting Concerns (active from Phase 0)

These apply from the very first commit, not added later:

| Concern | Location | Standard |
|---------|----------|----------|
| TypeScript strict mode | `tsconfig.json` | `strict: true` everywhere |
| Input validation | `packages/schemas` → Zod | All API inputs validated |
| Error handling | `packages/utilities/errors` | Never raw exceptions to user |
| Structured logging | `packages/logging` | request_id, trace_id on every log |
| Environment secrets | `.env` + host secrets manager | Never committed |
| API security | `apps/api/middleware/auth` | JWT on all routes |
| RLS | `supabase/migrations` | Policy on every table |
| Test coverage | Each package's `__tests__/` | Unit + integration minimum |
| CI | `.github/workflows/` | lint → typecheck → test → build |

---

## Build Rule

After every phase:

1. Run tests → fix errors
2. Typecheck (`tsc --noEmit`)
3. Lint (`eslint`)
4. Build
5. Verify migrations apply cleanly
6. Verify API contracts match schemas
7. Update `REQUIREMENTS_MATRIX.md` statuses
8. Commit a coherent change

**Do not stack phases without completing the checklist.**
