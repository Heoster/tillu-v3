# TILLU — Architecture Document

> Version: v1.0  
> Last updated: Phase 0  
> ADRs: see `docs/ADR/`

---

## 1. Architecture Summary

Tillu is a **deterministic, event-driven personal learning OS** with AI agents as intelligence plugins.

The core principle:

> **Deterministic services own truth. AI agents provide intelligence.**

This means:
- Mastery scores are calculated by `MasteryService`, not an LLM.
- Revision schedules are computed by `RevisionService`, not an LLM.
- Study history is written by application logic, not an LLM.
- LLMs generate explanations, questions, research, plans — but their output is always validated before it affects state.

---

## 2. System Architecture Diagram

```
                         ┌──────────────────────┐
                         │       HEOSTER        │
                         │ (Class 12 student)   │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │      TILLU WEB UI    │
                         │   (Next.js / React)  │
                         └──────────┬───────────┘
                                    │ HTTPS + WebSocket
                         ┌──────────▼───────────┐
                         │     TILLU CORE API   │
                         │   (Node.js / Express)│
                         │                      │
                         │  Policy Engine        │
                         │  NBA Engine          │
                         │  Recovery Planner    │
                         │  EventBus            │
                         └──────┬───────────────┘
                                │
           ┌────────────────────┼─────────────────────┐
           │                    │                     │
           ▼                    ▼                     ▼
  ┌──────────────┐    ┌──────────────────┐   ┌──────────────┐
  │ DOMAIN       │    │   AGENT HIVE     │   │  SCHEDULER   │
  │ SERVICES     │    │                  │   │   (n8n)      │
  │              │    │ Research Agent   │   │              │
  │ MasteryService    │ Tutor Agent      │   │ Morning plan │
  │ RevisionService   │ Quiz Agent       │   │ Daily quiz   │
  │ MistakeService    │ Planner Agent    │   │ Revision scan│
  │ SyllabusService   │ Exam Agent       │   │ Health check │
  │ StudyService │    │ Formula Agent    │   │ Night review │
  │ PlannerService    │ Mistake Agent    │   └──────┬───────┘
  │ NBAEngine    │    │ Presence Agent   │          │
  └──────┬───────┘    │ Sentinel Agent   │          │
         │            └──────┬───────────┘          │
         │                   │                      │
         └──────────┬────────┘──────────────────────┘
                    │
         ┌──────────▼───────────┐
         │      SUPABASE        │
         │  (PostgreSQL + Auth) │
         │                      │
         │  student state       │
         │  events (append-only)│
         │  mastery             │
         │  revision            │
         │  mistakes            │
         │  study history       │
         │  agent registry      │
         └──────────┬───────────┘
                    │
       ┌────────────┼──────────────┐
       ▼            ▼              ▼
  ┌─────────┐  ┌──────────┐  ┌──────────────┐
  │SENTINEL │  │  MODEL   │  │  LOCAL AGENT │
  │         │  │  ROUTER  │  │  (Node.js)   │
  │ monitors│  │          │  │              │
  │ all     │  │ Groq     │  │  Playwright  │
  │ agents  │  │ Cerebras │  │  Chromium    │
  │         │  │ OpenRouter  │              │
  │         │  │ HF       │  │  Lecture     │
  │ retry   │  └──────────┘  │  Player      │
  │ fallback│               └──────────────┘
  └─────────┘
```

---

## 3. Repository Structure

```
tillu/
│
├── apps/
│   ├── web/                     # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/             # App Router pages
│   │   │   ├── components/      # UI components
│   │   │   └── lib/             # Client-side utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                     # Core API server (Node.js / Express)
│   │   ├── src/
│   │   │   ├── routes/          # Route handlers
│   │   │   ├── services/        # Domain services (Mastery, Revision, etc.)
│   │   │   └── middleware/      # Auth, error handling, logging
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── local-agent/             # Local Playwright agent
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── agents/
│   ├── research/                # Research Agent
│   ├── tutor/                   # Tutor Agent
│   ├── quiz/                    # Quiz Agent
│   ├── revision/                # Revision Manager Agent
│   ├── planner/                 # Planner Agent
│   ├── exam/                    # Exam Agent
│   ├── formula/                 # Formula Agent
│   ├── mistake/                 # Mistake Agent
│   ├── presence/                # Presence Agent
│   └── sentinel/                # Sentinel (health monitor)
│
│   Each agent follows the structure:
│   agents/<name>/
│   ├── src/
│   │   ├── index.ts             # Express server with standard contract
│   │   ├── handler.ts           # Main agent logic
│   │   ├── validator.ts         # Zod schema validation
│   │   └── prompts/             # Versioned prompt files
│   ├── package.json
│   └── tsconfig.json
│
├── packages/
│   ├── schemas/                 # Shared Zod schemas (request/response/event)
│   ├── events/                  # Event type definitions + EventBus
│   ├── database/                # Supabase client + typed queries
│   ├── model-router/            # AI provider abstraction
│   │   └── src/
│   │       ├── router.ts
│   │       └── adapters/
│   │           ├── groq.ts
│   │           ├── cerebras.ts
│   │           ├── openrouter.ts
│   │           └── hf.ts
│   ├── logging/                 # Structured logger (request_id, trace_id)
│   ├── auth/                    # JWT utilities
│   ├── agent-sdk/               # Shared agent contract implementation
│   └── utilities/               # Error classes, retry, backoff, circuit breaker
│
├── workflows/
│   └── n8n/                     # n8n workflow JSON exports
│
├── supabase/
│   ├── migrations/              # Ordered SQL migration files
│   ├── functions/               # Supabase Edge Functions
│   └── seed/                    # Seed scripts (CBSE syllabus, formulas)
│
└── docs/
    ├── PRD.md
    ├── TRD.md
    ├── APP_FLOW.md
    ├── ARCHITECTURE.md          ← this file
    ├── REQUIREMENTS_MATRIX.md
    ├── IMPLEMENTATION_PLAN.md
    ├── ENV_SPEC.md
    ├── CODING_STANDARDS.md
    ├── ADR/
    │   ├── ADR-001-monorepo.md
    │   ├── ADR-002-supabase-state.md
    │   ├── ADR-003-deterministic-mastery.md
    │   ├── ADR-004-model-router.md
    │   ├── ADR-005-event-driven.md
    │   └── ADR-006-free-tier-strategy.md
    └── agents/                  # Per-agent design docs
```

---

## 4. Database Entity-Relationship Diagram

### Core Identity

```
users (Supabase Auth)
  id (uuid, PK)
  email
  created_at

student_profiles
  id (uuid, PK)
  user_id (FK → users.id)
  name
  class          -- '12'
  board          -- 'CBSE'
  exam_date
  created_at
  updated_at

student_preferences
  id (uuid, PK)
  student_id (FK → student_profiles.id)
  key            -- 'availability_start', 'sleep_start', etc.
  value
  source         -- 'configured' | 'observed' | 'inferred'
  updated_at
```

### Academic Graph

```
subjects
  id (uuid, PK)
  name           -- 'Physics'
  code           -- 'PHY'
  board          -- 'CBSE'
  class          -- '12'
  created_at

chapters
  id (uuid, PK)
  subject_id (FK → subjects.id)
  name           -- 'Ray Optics'
  unit           -- 'Optics'
  sequence       -- display order
  importance     -- [1..5]
  created_at

concepts
  id (uuid, PK)
  chapter_id (FK → chapters.id)
  name           -- 'Lens Formula'
  description
  importance     -- [1..5]  (board exam relevance)
  prerequisites  jsonb  -- array of concept_ids
  related        jsonb  -- array of concept_ids
  source         -- 'NCERT' | 'seed'
  source_version
  created_at
  updated_at
```

### Study Tracking

```
study_sessions
  id (uuid, PK)
  student_id (FK)
  subject_id (FK)
  chapter_id (FK, nullable)
  concept_id (FK, nullable)
  activity_type  -- 'lecture' | 'practice' | 'revision' | 'quiz' | 'exam'
  status         -- 'active' | 'paused' | 'completed' | 'abandoned'
  planned_duration_min
  actual_duration_min
  started_at
  ended_at
  created_at

study_tasks
  id (uuid, PK)
  session_id (FK → study_sessions.id)
  concept_id (FK)
  task_type
  status         -- 'planned' | 'ready' | 'active' | 'completed' | 'skipped' | 'postponed' | 'expired'
  created_at
  updated_at
```

### Mastery

```
mastery_states
  id (uuid, PK)
  student_id (FK)
  concept_id (FK)
  mastery_score          NUMERIC(5,2)  -- 0..100
  confidence             NUMERIC(5,2)
  recall_score           NUMERIC(5,2)
  practice_score         NUMERIC(5,2)
  pyq_score              NUMERIC(5,2)
  exam_score             NUMERIC(5,2)
  attempt_count          INT
  success_count          INT
  failure_count          INT
  last_attempt_at
  last_success_at
  last_failure_at
  forgetting_risk        NUMERIC(5,4)
  next_review_at
  mastery_algorithm_version  -- 'v1', 'v2', ...
  updated_at

mastery_events
  id (uuid, PK)
  student_id (FK)
  concept_id (FK)
  event_type     -- 'QUIZ_RESULT' | 'RECALL_RESULT' | 'TEST_RESULT' | 'MISTAKE' | etc.
  delta          NUMERIC(5,2)  -- score change
  evidence       jsonb         -- raw evidence that produced this event
  source_agent   -- which agent triggered this
  created_at
```

### Revision

```
revision_items
  id (uuid, PK)
  student_id (FK)
  concept_id (FK)
  revision_type  -- 'recall' | 'formula' | 'reaction' | 'flashcard' | 'question' | 'pyq' | 'mixed'
  priority       NUMERIC(5,4)
  difficulty     NUMERIC(5,4)
  stability      NUMERIC(5,4)
  last_review_at
  next_review_at
  attempt_count
  success_count
  failure_count
  status         -- 'active' | 'paused' | 'retired'
  revision_algorithm_version
  created_at
  updated_at

revision_events
  id (uuid, PK)
  revision_item_id (FK)
  student_id (FK)
  outcome        -- 'success' | 'failure' | 'partial'
  recall_quality INT  -- 0..5 (spaced-repetition quality score)
  notes
  created_at
```

### Mistakes

```
mistakes
  id (uuid, PK)
  student_id (FK)
  concept_id (FK)
  question_id (FK, nullable)
  error_type     -- 'conceptual' | 'formula' | 'calculation' | 'sign' | 'unit' | 'carelessness' | 'misreading' | 'memory' | 'time_pressure' | 'presentation'
  severity       -- 'low' | 'medium' | 'high'
  cause          TEXT
  attempt_number INT
  resolution_status  -- 'unresolved' | 'in_repair' | 'resolved'
  created_at
  updated_at

mistake_patterns
  id (uuid, PK)
  student_id (FK)
  concept_id (FK)
  pattern_type   TEXT
  error_type
  frequency      INT
  severity       -- 'low' | 'medium' | 'high'
  first_seen_at
  last_seen_at
  status         -- 'active' | 'resolved'
```

### Questions & Quizzes

```
questions
  id (uuid, PK)
  concept_id (FK)
  question_text  TEXT
  question_type  -- 'mcq' | 'short' | 'long' | 'numerical'
  options        jsonb   -- for MCQ
  answer         TEXT
  explanation    TEXT
  difficulty     -- 'easy' | 'medium' | 'hard'
  source         -- 'ai_generated' | 'pyq' | 'manual'
  source_year    INT  -- for PYQs
  schema_version TEXT
  model          TEXT    -- which model generated it
  prompt_version TEXT
  created_at

quizzes
  id (uuid, PK)
  student_id (FK)
  quiz_type      -- 'daily' | 'quick' | 'revision' | 'weakness' | 'mixed' | 'pyq' | 'exam_sim'
  status         -- 'ready' | 'active' | 'completed'
  question_ids   jsonb
  created_at
  completed_at

quiz_attempts
  id (uuid, PK)
  quiz_id (FK)
  student_id (FK)
  question_id (FK)
  student_answer TEXT
  is_correct     BOOLEAN
  time_taken_sec INT
  created_at
```

### Tests

```
tests
  id (uuid, PK)
  student_id (FK)
  subject_id (FK)
  test_type      -- 'chapter' | 'subject' | 'mock' | 'pyq'
  status
  score_obtained NUMERIC(5,2)
  max_score      NUMERIC(5,2)
  duration_min   INT
  started_at
  completed_at

test_attempts
  id (uuid, PK)
  test_id (FK)
  question_id (FK)
  student_answer TEXT
  marks_obtained NUMERIC(5,2)
  error_type
  created_at
```

### Lectures & Playlists

```
playlists
  id (uuid, PK)
  chapter_id (FK)
  title
  url            TEXT  -- YouTube playlist URL
  approved       BOOLEAN DEFAULT false
  created_at

lectures
  id (uuid, PK)
  playlist_id (FK)
  title
  url            TEXT  -- YouTube video URL
  sequence       INT
  duration_sec   INT
  created_at

lecture_progress
  id (uuid, PK)
  student_id (FK)
  lecture_id (FK)
  position_sec   INT
  duration_sec   INT
  completed      BOOLEAN DEFAULT false
  last_watched_at
  updated_at
```

### Formulas

```
formulas
  id (uuid, PK)
  concept_id (FK)
  subject_id (FK)
  expression     TEXT
  description    TEXT
  variables      jsonb   -- { "u": "object distance", ... }
  category       -- 'formula' | 'reaction' | 'theorem' | 'constant' | 'definition'
  importance     INT

formula_reviews
  id (uuid, PK)
  student_id (FK)
  formula_id (FK)
  outcome        -- 'recalled' | 'partial' | 'failed'
  next_review_at
  created_at
```

### Research

```
research_queries
  id (uuid, PK)
  student_id (FK)
  query          TEXT
  status         -- 'pending' | 'running' | 'completed' | 'failed'
  created_at
  completed_at

research_sources
  id (uuid, PK)
  query_id (FK)
  url            TEXT
  title          TEXT
  domain         TEXT
  source_type    -- 'web' | 'ncert' | 'textbook' | 'reference'
  retrieved_at
  content_hash   TEXT
  quality_score  NUMERIC(4,2)

research_claims
  id (uuid, PK)
  query_id (FK)
  claim          TEXT
  confidence     -- 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED'
  source_ids     jsonb   -- array of research_source ids
  created_at
```

### Planning

```
daily_plans
  id (uuid, PK)
  student_id (FK)
  plan_date      DATE
  total_available_min INT
  total_scheduled_min INT
  status         -- 'generated' | 'active' | 'revised' | 'completed'
  plan_version   INT
  generated_at
  updated_at

plan_items
  id (uuid, PK)
  plan_id (FK)
  concept_id (FK, nullable)
  task_type      -- 'study' | 'revision' | 'quiz' | 'formula_recall' | 'repair' | 'break'
  priority       -- 'critical' | 'high' | 'normal' | 'low' | 'optional'
  constraint_type -- 'fixed' | 'flexible'
  scheduled_start TIME
  estimated_duration_min INT
  reason         TEXT  -- human-readable reason
  status         -- 'planned' | 'active' | 'completed' | 'skipped' | 'moved' | 'dropped'
  created_at
  updated_at
```

### Presence & Notifications

```
presence_state
  id (uuid, PK)
  student_id (FK)
  state          -- 'UNKNOWN' | 'AVAILABLE' | 'STUDYING' | 'AWAY' | 'SLEEPING' | 'OFFLINE'
  confidence     NUMERIC(4,2)  -- 0..1, never 1.0 for inferred
  source_signals jsonb
  updated_at

presence_events
  id (uuid, PK)
  student_id (FK)
  from_state
  to_state
  trigger        TEXT
  created_at

notifications
  id (uuid, PK)
  student_id (FK)
  notification_type TEXT
  priority       -- 'critical' | 'high' | 'normal' | 'low'
  title          TEXT
  body           TEXT
  dedupe_key     TEXT  -- UNIQUE per student to prevent spam
  status         -- 'pending' | 'sent' | 'suppressed' | 'queued'
  sent_at
  created_at
```

### Agent Registry & Health

```
agents
  id (uuid, PK)
  name           TEXT UNIQUE
  version        TEXT
  endpoint       TEXT
  host_provider  TEXT
  enabled        BOOLEAN
  priority       INT
  capabilities   jsonb
  health_status  -- 'healthy' | 'degraded' | 'failing' | 'down' | 'unknown'
  health_score   NUMERIC(5,2)  -- 0..100
  last_heartbeat_at
  last_success_at
  last_failure_at
  failure_count  INT
  created_at
  updated_at

agent_heartbeats
  id (uuid, PK)
  agent_id (FK)
  status         TEXT
  latency_ms     INT
  uptime_sec     INT
  version        TEXT
  created_at

agent_tests
  id (uuid, PK)
  agent_id (FK)
  test_type      TEXT
  status         -- 'pass' | 'fail' | 'timeout'
  details        jsonb
  latency_ms     INT
  created_at

agent_failures
  id (uuid, PK)
  agent_id (FK)
  error_code     TEXT
  error_message  TEXT
  recovered      BOOLEAN DEFAULT false
  recovered_at
  created_at
```

### Event Ledger

```
events
  id (uuid, PK)
  event_type     TEXT        -- e.g. 'QUIZ_COMPLETED'
  schema_version TEXT        -- 'v1'
  source         TEXT        -- which service emitted it
  actor_id       uuid        -- student_id or agent_id
  correlation_id uuid        -- groups related events (e.g. one quiz session)
  trace_id       uuid        -- distributed trace
  payload        jsonb
  status         -- 'pending' | 'processed' | 'failed'
  retry_count    INT DEFAULT 0
  processed_at
  created_at

workflow_runs
  id (uuid, PK)
  workflow_name  TEXT
  trigger        TEXT
  status         -- 'running' | 'completed' | 'failed'
  error          TEXT
  started_at
  completed_at
```

---

## 5. Event Architecture

### Core Events (Phase 1)

```
USER_REGISTERED
PROFILE_CREATED
PROFILE_UPDATED

SESSION_STARTED
SESSION_PAUSED
SESSION_RESUMED
SESSION_COMPLETED
SESSION_ABANDONED
```

### Mastery Events (Phase 2)

```
MASTERY_UPDATED
MASTERY_DEGRADED
```

### Revision Events (Phase 3)

```
REVISION_SCHEDULED
REVISION_DUE
REVISION_COMPLETED
REVISION_FAILED
REVISION_RESCHEDULED
```

### Mistake Events (Phase 4)

```
MISTAKE_CREATED
MISTAKE_PATTERN_DETECTED
REPAIR_STARTED
REPAIR_COMPLETED
```

### Lecture Events (Phase 4)

```
LECTURE_STARTED
LECTURE_PROGRESS_UPDATED
LECTURE_COMPLETED
LECTURE_ABANDONED
```

### Quiz Events (Phase 5)

```
QUIZ_CREATED
QUIZ_STARTED
QUESTION_ATTEMPTED
QUESTION_CORRECT
QUESTION_INCORRECT
QUIZ_COMPLETED
```

### Planning Events (Phase 6)

```
PLAN_CREATED
PLAN_CHANGED
PLAN_RECOVERED
TASK_COMPLETED
TASK_SKIPPED
TASK_POSTPONED
```

### System Events (Phase 3+)

```
PRESENCE_CHANGED
AGENT_HEALTH_CHANGED
AGENT_FAILURE
AGENT_RECOVERED
QUOTA_THRESHOLD_REACHED
NOTIFICATION_SENT
NOTIFICATION_SUPPRESSED
```

### Event Envelope Schema

Every event MUST use this envelope:

```typescript
interface TilluEvent<T = unknown> {
  id: string;              // uuid v4
  event_type: string;      // e.g. "QUIZ_COMPLETED"
  schema_version: string;  // "v1"
  source: string;          // "quiz_agent" | "api" | "n8n" etc.
  actor_id: string;        // student_id
  correlation_id: string;  // groups related events
  trace_id: string;        // distributed trace
  timestamp: string;       // ISO-8601
  payload: T;
}
```

---

## 6. Agent Architecture

### Standard Contract

Every agent exposes exactly these endpoints:

```
GET  /health   → { status, version, uptime, timestamp }
GET  /ready    → { ready: boolean, reason?: string }
GET  /version  → { agent, version, build }
POST /test     → runs synthetic test, returns pass/fail
POST /run      → main agent execution
```

### Standard Request Envelope

```typescript
interface AgentRequest<T = unknown> {
  request_id: string;   // uuid
  trace_id: string;     // uuid
  agent: string;        // target agent name
  version: string;      // expected agent version
  timestamp: string;    // ISO-8601
  payload: T;
}
```

### Standard Response Envelope

```typescript
interface AgentResponse<T = unknown> {
  request_id: string;
  status: "success" | "error" | "partial";
  agent: string;
  version: string;
  result: T | null;
  errors: AgentError[];
  latency_ms: number;
  timestamp: string;
}

interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
}
```

### Agent List & Responsibilities

| Agent | Responsibility | Free Host Target |
|-------|----------------|-----------------|
| `research` | Query decomposition, parallel search, synthesis | Render free / HF Space |
| `tutor` | Socratic tutoring, hint-first guidance | Render free |
| `quiz` | Question generation, validation, difficulty control | Render free |
| `revision` | Spaced-repetition scheduling, recall management | Render free |
| `planner` | Daily plan generation, constraint enforcement | Render free |
| `exam` | Timed tests, PYQs, answer writing evaluation | Render free |
| `formula` | Formula extraction, recall scheduling | Render free |
| `mistake` | Error classification, pattern detection, repair | Render free |
| `presence` | Presence state machine, signal aggregation | runs in API |
| `sentinel` | Health monitoring, synthetic tests, recovery | Render free (separate) |

All agents in Phase 1 run **locally** (Docker). Cloud deployment is Phase 3+.

---

## 7. Model Router Architecture

```
ModelRouter
    │
    ├── GroqAdapter       (llama-3.3-70b, fast, free tier)
    ├── CerebrasAdapter   (llama-3.3-70b, fast inference, free tier)
    ├── OpenRouterAdapter (many models, free routes available)
    └── HFAdapter         (open models, HF Inference API)
```

### Task → Model Routing

| Task | Preferred Provider | Fallback |
|------|-------------------|---------|
| Simple classification / formatting | Cerebras (fastest) | Groq |
| Quiz generation | Groq | OpenRouter |
| Research synthesis | Groq (llama-3.3-70b) | OpenRouter |
| Complex tutoring / explanation | OpenRouter (stronger model) | Groq |
| Planning | Groq | Cerebras |

### Circuit Breaker States

```
CLOSED  → normal operation
OPEN    → provider failed; requests rejected immediately; cooldown timer
HALF_OPEN → test request sent after cooldown; if success → CLOSED; if fail → OPEN
```

---

## 8. Self-Healing & Recovery Flow

```
Failure detected by Sentinel
         ↓
Classify: transient | persistent | critical
         ↓
Retry (max 3, exponential backoff: 1s, 2s, 4s)
         ↓
Switch model provider (ModelRouter fallback)
         ↓
Switch agent host (if registered alternate)
         ↓
Use deterministic fallback (RevisionService / PlannerService)
         ↓
Degrade capability gracefully
         ↓
Notify student with human-readable message (not HTTP codes)
```

---

## 9. Architecture Decision Records (ADRs)

### ADR-001 — Monorepo with pnpm workspaces

**Decision:** Use a single monorepo managed by pnpm workspaces.  
**Reason:** Shared packages (`schemas`, `events`, `model-router`) need to be consumed by all agents and apps without complex publishing. TypeScript path aliases work cleanly.  
**Tradeoff:** Large repo; mitigated by workspace-level build/test scripts.  
**Status:** Accepted

---

### ADR-002 — Supabase as Single Source of Truth

**Decision:** Supabase (PostgreSQL + Auth + RLS) is the canonical persistent state layer.  
**Reason:** Free tier, built-in auth, RLS, real-time subscriptions, managed hosting. No custom auth infra needed for MVP.  
**Tradeoff:** Vendor dependency; mitigated by using standard PostgreSQL SQL so migrations can target any Postgres.  
**Status:** Accepted

---

### ADR-003 — Deterministic Mastery (AI Cannot Write Final Score)

**Decision:** `MasteryService` owns all mastery score computation. AI agents may provide evidence (classified error type, difficulty estimate) but never write directly to `mastery_states`.  
**Reason:** AI output is non-deterministic, hallucination-prone, and unauditable. Student marks are high-stakes data.  
**Tradeoff:** Mastery algorithm must be maintained manually. Worth the investment.  
**Status:** Accepted — Critical invariant INV-001

---

### ADR-004 — Model Router Abstraction

**Decision:** All AI calls go through `packages/model-router`. No agent calls `groq.chat(...)` directly.  
**Reason:** Provider-agnostic code; enables fallback, circuit breaking, quota tracking, and model swaps without touching agent logic.  
**Tradeoff:** Extra indirection layer; cost is minimal.  
**Status:** Accepted

---

### ADR-005 — Append-Only Event Ledger

**Decision:** The `events` table is append-only. State is derived from events, not mutated in place.  
**Reason:** Audit trail, idempotency, replay capability. If mastery calculation has a bug, we can recalculate from raw events.  
**Tradeoff:** Query complexity for derived views; solved with materialized tables (mastery_states, revision_items).  
**Status:** Accepted

---

### ADR-006 — Free-Tier First Architecture

**Decision:** All hosting choices prefer zero-cost tiers initially. No component may require paid hosting to function.  
**Reason:** ₹0/month target.  
**Implications:**
- Agents must tolerate cold starts (sleep on free tier)
- Local agent handles time-critical operations
- Background jobs are staggered to avoid burst
- Circuit breaker prevents wasting quota on failed providers  
**Status:** Accepted

---

### ADR-007 — No Rigid "One Agent per Host" Rule

**Decision:** Related lightweight agents may share a host process. Different failure domains matter more than different processes.  
**Reason:** Free-tier hosts are scarce. Splitting every tiny agent onto its own Render/HF Space wastes quota.  
**Critical failure domains (must be separate):** Database, Model Provider(s), Core API, Automation (n8n), Local Agent.  
**Status:** Accepted — overrides TRD suggestion of "every agent on a different host"

---

## 10. Security Architecture

| Concern | Mechanism |
|---------|-----------|
| Authentication | Supabase Auth (JWT) |
| Authorization | Row Level Security on all tables |
| Service-to-service | Signed requests with shared secrets (Phase 3+) |
| Secrets management | Environment variables; never committed; host secret stores |
| API key exposure | Keys only in `apps/api` and agents; never in `apps/web` bundle |
| Input validation | Zod on all API inputs and all LLM outputs |
| Audit logging | `events` table is the audit trail |
| Rate limiting | Express rate-limit middleware on public routes |
| Browser scope | Local agent locked to approved domain list only |
| Student data | Minimal collection; no webcam/mic/keylogger by default |

---

## 11. Observability

Every API request and agent call emits a structured log entry:

```typescript
{
  request_id: string,
  trace_id: string,
  service: string,
  operation: string,
  status: "success" | "error",
  latency_ms: number,
  agent?: string,
  provider?: string,
  error_code?: string,
  timestamp: string
}
```

System health dashboard surfaces:

```
CORE API        status / uptime
DATABASE        connection status
AGENTS          health score per agent
MODEL PROVIDERS status per provider
n8n WORKFLOWS   last run / status
LOCAL AGENT     online / offline
```

---

## 12. Phase 0 Completion Checklist

- [x] Repository structure created
- [x] `docs/REQUIREMENTS_MATRIX.md`
- [x] `docs/IMPLEMENTATION_PLAN.md`
- [x] `docs/ARCHITECTURE.md` (this document)
- [ ] `docs/ENV_SPEC.md`
- [ ] Root `package.json` (pnpm workspaces)
- [ ] Root `tsconfig.json` (strict)
- [ ] `.gitignore`
- [ ] `.env.example`
- [ ] `CODING_STANDARDS.md`
- [ ] ADR files written
- [ ] Await user approval before Phase 1
