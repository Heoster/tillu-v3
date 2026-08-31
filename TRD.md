
# TILLU — Technical Requirements Document

**Document:** TRD v1.0
**Product:** Tillu Personal Study OS
**Status:** Architecture / Engineering Baseline
**Target:** Class 12 CBSE Board preparation
**Infrastructure budget:** ₹0/month
**Primary deployment model:** Hybrid cloud + local
**Architecture:** Event-driven, multi-agent, fault-tolerant

---

# 1. Technical Vision

Tillu shall be implemented as a **distributed, event-driven personal learning system**.

It will consist of:

```text
Web UI
   │
   ▼
Tillu Core
   │
   ├── Student State
   ├── Planning
   ├── Policy
   └── Agent Orchestration
           │
           ▼
       Agent Hive
           │
   ┌───────┼────────┐
   ▼       ▼        ▼
Research Tutor Revision ...
   │       │        │
   └───────┼────────┘
           ▼
        Supabase
           │
      Event Ledger
           │
           ▼
        Sentinel
           │
   ┌───────┼────────┐
   ▼       ▼        ▼
 Cloud    n8n      Local
Agents             Agent
                    │
                 Chromium
```

The architecture must tolerate:

* sleeping free-tier hosts
* temporary API failures
* model rate limits
* network failures
* agent crashes
* malformed AI output
* database outages
* local computer being offline

---

# 2. Architecture Principles

## TR-001 — Event Driven

Services should communicate primarily through events rather than tightly coupled synchronous chains.

Example:

```text
QUIZ_COMPLETED
      ↓
MASTERY_UPDATE_REQUESTED
      ↓
MASTERY_UPDATED
      ↓
REVISION_RESCHEDULED
      ↓
PLAN_RECALCULATION_REQUESTED
```

---

# 3. TR-002 — Supabase as Shared State

Supabase shall act as the central source of persistent application state.

Use it for:

* PostgreSQL database
* Authentication
* Row-level security
* persistent events
* agent registry
* student state
* study history
* revision state
* test results
* research metadata

Supabase must **not** become the synchronous dependency for every tiny operation.

---

# 4. TR-003 — Local-First Tolerance

The local system must continue limited operation when the cloud is unavailable.

```text
Cloud unavailable
       ↓
Local event queue
       ↓
Continue permitted local actions
       ↓
Cloud restored
       ↓
Synchronize
```

---

# 5. System Components

| Component            | Responsibility              |
| -------------------- | --------------------------- |
| Tillu UI             | Student interface           |
| Tillu Core           | Orchestration + decisions   |
| Student State Engine | Maintains academic state    |
| Mastery Engine       | Calculates mastery          |
| Revision Engine      | Schedules recall            |
| Quiz Engine          | Generates/evaluates quizzes |
| Mistake Engine       | Tracks errors               |
| Research Agent       | External research           |
| Tutor Agent          | Teaching                    |
| Exam Engine          | Tests/PYQs                  |
| Formula Engine       | Formula/reaction recall     |
| Presence Engine      | Availability state          |
| Planner              | Adaptive scheduling         |
| Lecture Agent        | Local lecture automation    |
| Sentinel             | Reliability/health          |
| Model Router         | AI provider selection       |
| n8n                  | Automation                  |
| Supabase             | Persistence                 |
| Local Agent          | Local computer integration  |

---

# 6. Repository Architecture

Recommended monorepo:

```text
tillu/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── local-agent/
│
├── agents/
│   ├── research/
│   ├── tutor/
│   ├── quiz/
│   ├── revision/
│   ├── planner/
│   ├── exam/
│   ├── formula/
│   └── sentinel/
│
├── packages/
│   ├── schemas/
│   ├── events/
│   ├── database/
│   ├── model-router/
│   ├── logging/
│   ├── auth/
│   └── utilities/
│
├── workflows/
│   └── n8n/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed/
│
└── docs/
    ├── PRD.md
    ├── TRD.md
    ├── ADR/
    └── agents/
```

---

# 7. Technology Requirements

The exact versions should be pinned during implementation.

Recommended stack:

### Frontend

```text
Next.js / React
TypeScript
```

### Backend

```text
TypeScript
Node.js
```

### Database

```text
PostgreSQL
Supabase
```

### Automation

```text
n8n
```

### Local agent

```text
Node.js / Python
Playwright
Chromium
```

### Validation

```text
Zod / JSON Schema
```

### API

```text
REST
WebSocket/SSE where useful
```

### AI

Provider abstraction supporting:

```text
Groq
Cerebras
OpenRouter
Hugging Face-hosted models/services
```

Provider availability must be checked at deployment time because free-tier limits change.

---

# 8. Agent Architecture

Every agent must be independently deployable.

Each agent must implement:

```text
GET  /health
GET  /ready
GET  /version
POST /test
POST /run
```

---

# 9. Agent Contract

All agent requests should use a common envelope.

```json
{
  "request_id": "uuid",
  "trace_id": "uuid",
  "agent": "revision_manager",
  "version": "1.0.0",
  "timestamp": "ISO-8601",
  "payload": {}
}
```

Response:

```json
{
  "request_id": "uuid",
  "status": "success",
  "agent": "revision_manager",
  "version": "1.0.0",
  "result": {},
  "errors": []
}
```

AI-generated output must never be trusted directly.

It must pass schema validation.

---

# 10. Agent Registry

Table:

```text
agents
```

Fields:

```text
id
name
version
endpoint
host_provider
enabled
priority
capabilities
status
health_score
last_heartbeat
last_success
last_failure
failure_count
created_at
updated_at
```

---

# 11. Event System

Table:

```text
events
```

Fields:

```text
id
event_type
source
actor
payload
schema_version
created_at
processed_at
status
retry_count
correlation_id
```

Example:

```json
{
  "event_type": "QUIZ_COMPLETED",
  "source": "quiz_agent",
  "payload": {
    "quiz_id": "123",
    "score": 7,
    "max_score": 10
  }
}
```

---

# 12. Event Processing

Events must be:

* idempotent
* traceable
* retryable
* versioned

An event processor must avoid processing the same event twice.

Use:

```text
event_id
+
consumer_id
```

as an idempotency key.

---

# 13. Core Database Model

Primary tables:

```text
users
student_profiles

subjects
chapters
concepts

study_tasks
study_sessions

mastery_states
mastery_events

revision_items
revision_events

mistakes
mistake_patterns

questions
quizzes
quiz_attempts

tests
test_attempts

formulas
formula_reviews

lectures
playlists
lecture_progress

research_queries
research_sources
research_claims

daily_plans
plan_items

presence_events
presence_state

agents
agent_heartbeats
agent_tests
agent_failures

events
workflow_runs
notifications
```

---

# 14. Concept Model

Each academic concept should have:

```text
id
chapter_id
name
description
importance
prerequisites
metadata
created_at
updated_at
```

The concept is the primary unit of learning measurement.

---

# 15. Mastery Model

```text
mastery_states

student_id
concept_id

mastery_score
confidence
recall_score
practice_score
pyq_score
exam_score

attempt_count
success_count
failure_count

last_attempt
last_success
last_failure

forgetting_risk
next_review

updated_at
```

---

# 16. Mastery Calculation

The first implementation should be deterministic and explainable.

Conceptually:

```text
Mastery =
weighted evidence
+
recency
+
difficulty adjustment
-
failure penalties
```

Do not allow an LLM to directly assign final mastery.

AI may provide:

```text
error classification
difficulty estimation
concept mapping
```

The scoring engine calculates the final value.

---

# 17. Revision Engine

Revision item:

```text
revision_items

id
student_id
concept_id
revision_type

priority
difficulty
stability

last_review
next_review

attempt_count
success_count
failure_count

status
```

Supported revision types:

```text
recall
formula
reaction
flashcard
concept_explanation
question
pyq
mixed_practice
```

---

# 18. Revision Algorithm

Initial implementation can use an adaptive spaced-repetition model.

Inputs:

```text
previous interval
success/failure
difficulty
recall quality
time since review
concept importance
```

Output:

```text
next_review_at
priority
review_type
```

The algorithm must be versioned.

```text
revision_algorithm_version
```

This allows future improvements without corrupting historical data.

---

# 19. Forgetting Radar

The system periodically calculates:

```text
forgetting_risk ∈ [0,1]
```

Priority:

```text
revision_priority =
importance
× forgetting_risk
× weakness
× exam_relevance
```

The exact formula must remain configurable.

---

# 20. Mistake Engine

Each mistake requires:

```text
question_id
student_id
concept_id
error_type
severity
cause
attempt_number
resolution_status
created_at
```

Supported errors:

```text
conceptual
formula
calculation
sign
unit
carelessness
misreading
memory
time_pressure
presentation
```

---

# 21. Mistake Pattern Detection

Repeated mistakes should be grouped.

Example:

```text
4 mistakes
↓
same concept
↓
same error type
↓
pattern detected
```

Create:

```text
mistake_patterns
```

with:

```text
concept_id
pattern_type
frequency
severity
first_seen
last_seen
status
```

---

# 22. Quiz Engine

Quiz generation request:

```json
{
  "subject": "Physics",
  "concepts": ["ray-optics"],
  "count": 5,
  "difficulty": "mixed",
  "purpose": "revision"
}
```

Generated quiz must validate:

```text
question
options if applicable
answer
explanation
concept_id
difficulty
source/reference if applicable
```

---

# 23. LLM Output Validation

Every structured LLM response must pass:

```text
LLM
 ↓
Parse
 ↓
Schema validation
 ↓
Semantic validation
 ↓
Safety validation
 ↓
Business rules
 ↓
Store
```

Invalid output:

```text
retry
 ↓
fallback model
 ↓
deterministic fallback
```

---

# 24. Model Router

The Model Router abstracts providers.

```text
ModelRouter.generate({
    task,
    complexity,
    latency_budget,
    token_budget
})
```

Provider adapters:

```text
GroqAdapter
CerebrasAdapter
OpenRouterAdapter
HFAdapter
```

---

# 25. Model Selection

Example routing:

```text
simple classification
→ fastest/cheapest provider

quiz generation
→ fast model

complex explanation
→ stronger model

research synthesis
→ stronger model

provider failure
→ next available provider
```

The router should maintain:

```text
provider_status
rate_limit_state
recent_latency
failure_rate
```

---

# 26. Research Architecture

Research pipeline:

```text
Query
 ↓
Query decomposition
 ↓
Parallel search
 ↓
Source collection
 ↓
Deduplication
 ↓
Source quality scoring
 ↓
Claim extraction
 ↓
Cross-checking
 ↓
Synthesis
 ↓
Citation mapping
```

Research output:

```text
claims[]
sources[]
confidence
retrieved_at
```

---

# 27. Research Source Model

```text
research_sources

id
query_id
url
title
domain
source_type
retrieved_at
content_hash
quality_score
```

Claims:

```text
research_claims

id
query_id
claim
confidence
source_ids
```

---

# 28. Planner Architecture

Planner input:

```text
student_state
available_time
fixed_commitments
deadlines
mastery
revision_due
mistakes
recent_performance
```

Planner output:

```text
daily_plan
plan_items
reason
priority
estimated_duration
confidence
```

---

# 29. Planner Constraints

Hard constraints:

```text
sleep
exam
school
explicit user commitments
```

Soft constraints:

```text
preferred study time
preferred subject
energy
task type
```

The planner must never schedule:

```text
total scheduled time > available time
```

unless explicitly marked as an overload warning.

---

# 30. Presence Engine

Presence must be privacy-preserving.

Possible signals:

```text
web session activity
local agent heartbeat
lecture activity
explicit status
study session
recent interaction
```

Output:

```json
{
  "state": "AVAILABLE",
  "confidence": 0.82,
  "timestamp": "..."
}
```

Never represent inferred presence as certainty.

---

# 31. Presence State Machine

```text
UNKNOWN
  │
  ├── activity → AVAILABLE
  │
  ├── study event → STUDYING
  │
  ├── inactivity → AWAY
  │
  └── schedule/device state → SLEEPING/OFFLINE
```

Transitions must be configurable.

---

# 32. Adaptive Scheduling

When presence changes:

```text
presence event
 ↓
planner evaluates current plan
 ↓
check whether active task is affected
 ↓
recalculate
 ↓
notify only if meaningful
```

Avoid constantly changing the plan.

Introduce a **replanning threshold**.

Example:

> Don't rebuild the schedule for a 2-minute delay.

---

# 33. Next Best Action Engine

Input:

```text
current time
presence
available duration
mastery
revision urgency
deadlines
mistakes
exam importance
current activity
```

Output:

```text
task_id
reason
duration
confidence
```

Example:

```text
Integration PYQs
35 minutes

Reasons:
- revision due
- mastery 48%
- 3 recent mistakes
- exam relevance high
```

---

# 34. Opportunistic Study Engine

Task candidates are filtered by duration:

```text
available_time >= minimum_duration
```

Examples:

```text
5 min → recall
10 min → quiz
15 min → mistake review
30 min → PYQ
60 min → deep work
```

---

# 35. Recovery Engine

When a task becomes overdue:

```text
task overdue
 ↓
calculate remaining capacity
 ↓
protect high-priority tasks
 ↓
reschedule
 ↓
merge small tasks
 ↓
drop low-value tasks
```

No automatic infinite backlog.

---

# 36. Lecture Player

Local agent:

```text
Local Tillu
    │
    ▼
Playwright
    │
    ▼
Controlled Chromium
    │
    ▼
Approved YouTube playlist
```

The local agent must only operate on explicitly configured domains/pages/actions.

---

# 37. Lecture Data

```text
playlists
lectures
lecture_progress
```

Track:

```text
playlist_id
chapter_id
lecture_id
position_seconds
duration_seconds
completed
last_watched_at
```

---

# 38. Local/Cloud Synchronization

Local:

```text
SQLite/local JSON/event queue
```

Cloud:

```text
Supabase
```

Sync protocol:

```text
local_event_id
+
event_timestamp
+
event_version
```

Duplicate events must be ignored.

---

# 39. Sentinel Architecture

Sentinel is independent from individual agents.

```text
Sentinel
 │
 ├── heartbeat monitor
 ├── readiness monitor
 ├── synthetic tests
 ├── latency monitor
 ├── failure monitor
 ├── quality monitor
 ├── provider monitor
 └── recovery controller
```

---

# 40. Heartbeat

Every running agent reports:

```text
agent_id
timestamp
version
status
uptime
last_job
```

Heartbeat timeout:

```text
Healthy
 ↓
missed heartbeat
 ↓
Degraded
 ↓
multiple misses
 ↓
Down
```

Thresholds should be configurable per host.

---

# 41. Synthetic Testing

Sentinel periodically executes real test tasks.

Example:

```text
Revision test:
5 concepts
→ expected valid revision schedule

Quiz test:
generate 3 questions
→ schema + semantic checks

Planner test:
2 hours
→ plan <= 2 hours

Research test:
known question
→ source + claim
```

---

# 42. Agent Health Score

Example:

```text
Health Score =
30% liveness
40% correctness
20% reliability
10% latency
```

Quality scoring can be expanded later.

Status:

```text
90–100 → HEALTHY
75–89  → DEGRADED
50–74  → FAILING
0–49   → DOWN
```

Thresholds configurable.

---

# 43. Self-Healing

Recovery order:

```text
Failure
 ↓
Retry
 ↓
Exponential backoff
 ↓
Alternate model
 ↓
Alternate agent host
 ↓
Deterministic fallback
 ↓
Disable affected capability
 ↓
Notify student
```

---

# 44. Circuit Breaker

If a provider repeatedly fails:

```text
OPEN
```

Temporarily stop sending requests.

After cooldown:

```text
HALF OPEN
```

Test.

If successful:

```text
CLOSED
```

This prevents wasting free API quotas on a broken provider.

---

# 45. Cost/Quota Monitor

Because infrastructure is ₹0, Tillu needs a **Quota Guardian**.

Track:

```text
API calls
tokens
estimated usage
requests/hour
provider limits
workflow executions
storage usage
```

When approaching limits:

```text
NORMAL
 ↓
CONSERVE
 ↓
RESTRICT
 ↓
FALLBACK
```

---

# 46. Free-Tier Strategy

The system must not assume unlimited:

```text
CPU
RAM
execution time
requests
tokens
storage
bandwidth
```

Agents should therefore be:

* stateless where possible
* lightweight
* event-triggered
* independently deployable
* capable of cold start
* tolerant of sleep

---

# 47. Hosting Isolation

Your requirement:

> Every agent should use a different hosting platform.

Technically, I would modify this slightly.

### Do not force every tiny agent onto a separate host.

Instead:

```text
Different failure domains for critical capabilities.
```

Example:

```text
Host A → Core
Host B → Research
Host C → Learning agents
Host D → Automation
Local → Chromium
```

Within each host, multiple lightweight agents can coexist.

This avoids wasting scarce free-tier resources.

---

# 48. Critical Failure Domains

At minimum:

```text
Database
Model providers
Core API
Automation
Local agent
```

must not all depend on the same service.

---

# 49. Security Architecture

All requests between services should authenticate.

Use:

```text
service credentials
signed requests
short-lived tokens where practical
```

Never expose:

```text
model API keys
Supabase service-role keys
automation secrets
```

to the browser.

---

# 50. Supabase Security

Use Row Level Security.

The client must only access the student's own records.

Example conceptual policy:

```text
student_id = authenticated_user_id
```

Service-to-service operations should use controlled backend credentials.

---

# 51. Secrets

Secrets must be stored in host-provided secret/environment systems.

Never:

```text
commit .env
```

Never place keys in:

```text
frontend JavaScript
Git repository
logs
event payloads
```

---

# 52. Logging

Every request should include:

```text
request_id
trace_id
agent
event_id
timestamp
```

Logs should capture:

```text
start
end
status
latency
provider
error_code
```

Do not log sensitive student content unnecessarily.

---

# 53. Observability

Dashboard:

```text
SYSTEM
Agents       8/8
Workflows    14/14
Providers     3/3
Database      🟢
Local Agent   🟢
```

Agent view:

```text
Revision Agent

Health       97%
Latency      820ms
Success      99.1%
Last test    12m ago
Version      1.2.1
```

---

# 54. Notifications Architecture

Notification service receives:

```text
notification.created
```

and applies:

```text
priority
presence
quiet_hours
notification_preferences
deduplication
```

Example:

```text
student studying
+
low priority
=
don't notify
```

---

# 55. Notification Deduplication

The same event must not create:

```text
10 identical notifications
```

Use:

```text
dedupe_key
```

Example:

```text
revision_due:concept_123:2026-08-31
```

---

# 56. Automation Architecture

n8n should primarily handle:

```text
scheduled triggers
webhooks
agent invocation
notifications
maintenance
```

It should **not become the source of student state**.

Supabase remains the state authority.

---

# 57. Example n8n Morning Workflow

```text
CRON
 ↓
Fetch student state
 ↓
Fetch revision due
 ↓
Fetch deadlines
 ↓
Check presence
 ↓
Call planner
 ↓
Validate plan
 ↓
Store plan
 ↓
Generate daily quiz
 ↓
Generate formula recall
 ↓
Send notification if appropriate
```

---

# 58. Example Nightly Workflow

```text
CRON
 ↓
Daily performance aggregation
 ↓
Mastery update
 ↓
Revision update
 ↓
Mistake pattern detection
 ↓
Tomorrow planning
 ↓
Sentinel system tests
 ↓
Health report
```

---

# 59. End-to-End Study Workflow

```text
Student starts lecture
        ↓
LOCAL AGENT
        ↓
lecture_progress
        ↓
LECTURE_COMPLETED
        ↓
concept exposure
        ↓
recall scheduled
        ↓
recall performed
        ↓
MASTERY UPDATED
        ↓
revision scheduled
        ↓
quiz generated
        ↓
quiz completed
        ↓
mistake detected
        ↓
repair session
        ↓
mastery updated
        ↓
planner recalculates
```

---

# 60. Offline Workflow

If local computer loses internet:

```text
Study
 ↓
Local event
 ↓
Local queue
```

When connection returns:

```text
Queue
 ↓
Validate
 ↓
Upload
 ↓
Deduplicate
 ↓
Mark synced
```

---

# 61. Data Consistency

The system should prefer:

```text
append-only events
```

for important historical actions.

Derived tables can then be rebuilt.

For example:

```text
study_session events
        ↓
study statistics
        ↓
dashboard
```

This makes recovery easier.

---

# 62. Versioning

Version:

```text
database schema
event schemas
agent APIs
AI prompts
mastery algorithm
revision algorithm
quiz format
```

Example:

```text
event schema v1
agent API v1
mastery algorithm v2
```

Historical data must remain interpretable.

---

# 63. AI Prompt Management

Prompts should not be scattered throughout code.

Store them in:

```text
agents/<agent>/prompts/
```

with versions:

```text
revision_v1
revision_v2
```

Every AI-generated artifact should optionally record:

```text
model
prompt_version
agent_version
```

This allows debugging.

---

# 64. AI Hallucination Controls

For factual academic/research content:

```text
AI answer
 ↓
source/context validation
 ↓
confidence
```

For deterministic data:

```text
database
 ↓
calculation
```

not LLM.

---

# 65. Research Trust Model

Research confidence:

```text
HIGH
MEDIUM
LOW
UNVERIFIED
```

Never silently convert:

```text
LOW → FACT
```

---

# 66. Testing Strategy

### Unit tests

For:

* mastery
* revision
* planner
* scoring
* event processing

### Integration tests

For:

* Supabase
* agent APIs
* model router
* n8n

### Contract tests

Every agent must satisfy the common API.

### Synthetic tests

Sentinel runs these continuously.

### End-to-end tests

Test:

```text
lecture
→ mastery
→ revision
→ quiz
→ mistake
→ replanning
```

---

# 67. Failure Injection

Before calling Tillu production-ready, deliberately simulate:

```text
database unavailable
model timeout
agent crash
malformed JSON
rate limit
host sleep
network disconnect
duplicate event
stale heartbeat
```

The expected behavior must be defined for every failure.

---

# 68. Performance Requirements

Target—not hard guarantees on free infrastructure:

```text
UI interaction: < 1 sec where cached
Simple API: < 2 sec
Quiz generation: asynchronous if slow
Research: asynchronous
Daily planning: asynchronous
```

Long AI tasks must not block the UI.

Use:

```text
job_id
status
progress
```

---

# 69. Background Job Model

Long tasks:

```text
POST /jobs
      ↓
job_id
      ↓
queued
      ↓
running
      ↓
completed/failed
```

UI can poll or subscribe.

---

# 70. State Machine Requirements

Important entities should use explicit states.

Example task:

```text
PLANNED
 ↓
READY
 ↓
ACTIVE
 ↓
COMPLETED
```

Alternative:

```text
SKIPPED
POSTPONED
EXPIRED
CANCELLED
```

Avoid ambiguous booleans like:

```text
done=true
```

for complex workflows.

---

# 71. Permission Model

Capabilities:

```text
student
local_agent
agent
admin/developer
```

The local agent should have only permissions necessary for:

```text
lecture playback
progress tracking
approved browser actions
```

It must not receive unrestricted cloud credentials.

---

# 72. Local Agent Safety

The local agent must support:

```text
enabled/disabled
allowed domains
allowed actions
manual stop
emergency kill
```

A global:

> **STOP LOCAL AUTOMATION**

control should exist.

---

# 73. Premium UX Requirements

Even with ₹0 infrastructure, Tillu should provide:

* adaptive dashboard
* personalized recommendations
* daily intelligence
* revision radar
* mistake intelligence
* mastery graph
* exam readiness
* automatic quizzes
* formula recall
* research assistant
* lecture continuation
* focus mode
* smart notifications
* recovery plans
* health monitoring

The premium feeling should come from **integration and intelligence**, not expensive infrastructure.

---

# 74. System Health Dashboard

Required:

```text
┌──────────────────────────────────┐
│ TILLU SYSTEM HEALTH              │
├──────────────────────────────────┤
│ Core              🟢 99%         │
│ Research          🟢 97%         │
│ Tutor             🟢 99%         │
│ Quiz              🟢 98%         │
│ Revision          🟢 100%        │
│ Planner           🟡 87%         │
│ Local Agent       🟢             │
├──────────────────────────────────┤
│ Providers                        │
│ Groq              🟢             │
│ Cerebras          🟢             │
│ OpenRouter        🟡             │
├──────────────────────────────────┤
│ Last full test: 23:30            │
└──────────────────────────────────┘
```

---

# 75. Technical Definition of "Autonomous"

Tillu is considered autonomous when it can execute without a user request:

```text
observe student state
→ identify required action
→ schedule
→ invoke agents
→ validate results
→ update state
→ notify when appropriate
→ recover from failures
```

But autonomy must be bounded by policy.

---

# 76. Policy Engine

Before an autonomous action:

```text
Agent recommendation
       ↓
Policy Engine
       ↓
Allowed?
       │
   ┌───┴───┐
   YES     NO
    ↓       ↓
 Execute   Reject
```

Policies include:

```text
allowed hours
notification rules
browser permissions
agent permissions
model budget
research scope
automation limits
```

---

# 77. Cost Guardian

Because budget = ₹0:

```text
             COST GUARDIAN
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
    Tokens       APIs       Hosting
      │           │           │
      └───────────┼───────────┘
                  ▼
              Budget State
```

States:

```text
NORMAL
CONSERVE
EMERGENCY
```

Emergency mode:

```text
AI generation ↓
Research frequency ↓
Use deterministic algorithms
Use cached knowledge
Use local processing
```

---

# 78. Caching

Cache:

* repeated research
* syllabus information
* formulas
* generated explanations where appropriate
* static academic metadata

Cache key:

```text
normalized_query
+
context_version
```

This reduces free-tier usage.

---

# 79. Queue Requirements

A lightweight queue is required.

Priority:

```text
CRITICAL
HIGH
NORMAL
LOW
```

Example:

```text
exam imminent → HIGH
revision due → NORMAL
background research → LOW
```

---

# 80. Agent Scheduling

Agents should not all wake at the same time.

Use staggered scheduling to prevent:

```text
API burst
database burst
host overload
```

Example:

```text
06:30 planner
06:35 quiz
06:40 formula
06:45 research
```

---

# 81. Deployment Strategy

### Phase 1

Local development:

```text
Docker
Supabase project
local n8n
local agents
```

### Phase 2

Deploy only stable components.

### Phase 3

Move suitable agents to free hosts.

### Phase 4

Add failover.

### Phase 5

Enable autonomous schedules.

Do not start with 10 independent deployments.

---

# 82. Environment Separation

```text
development
staging
production
```

For ₹0 MVP, staging can be lightweight/local rather than a permanently hosted duplicate.

---

# 83. CI/CD

Every deployment should run:

```text
lint
typecheck
unit tests
schema tests
agent contract tests
build
```

Deployment should be versioned.

---

# 84. Rollback

Every agent deployment must allow:

```text
current version
previous known-good version
```

Sentinel can detect degradation and trigger or recommend rollback.

---

# 85. Technical KPIs

### Reliability

```text
agent success rate
workflow success rate
availability
failure recovery rate
```

### AI

```text
schema-valid response rate
fallback rate
latency
provider failure rate
```

### Learning

```text
recall improvement
mastery improvement
mistake recurrence
revision adherence
test performance
```

### System

```text
API consumption
storage
workflow execution
free-tier usage
```

---

# 86. Critical Invariants

These must **always** remain true.

### INV-001

AI cannot directly modify marks.

### INV-002

AI cannot directly change historical study records.

### INV-003

Revision scheduling must be reproducible from stored state.

### INV-004

Duplicate events must not duplicate study history.

### INV-005

A failed AI provider must not destroy a workflow.

### INV-006

The local agent must be disableable.

### INV-007

The student can override an automated plan.

### INV-008

No agent can access data beyond its permissions.

### INV-009

Presence inference must never be represented as certainty.

### INV-010

No autonomous workflow should create an unbounded task loop.

---

# 87. Priority Matrix

## P0 — Required

```text
Supabase
Student state
Concept model
Study tracker
Mastery
Revision
Quiz
Mistakes
Planner
Authentication
Event system
Basic Sentinel
```

## P1 — Important

```text
Research
Tutor
Formula manager
PYQs
Exam engine
Presence
Notifications
Local agent
Lecture player
Model router
Failover
```

## P2 — Advanced

```text
Learning Scientist
predictive mastery
exam forecast
advanced quality monitoring
behavior optimization
```

---

# 88. Recommended Build Sequence

```text
STEP 1
Repository + TypeScript foundation

        ↓

STEP 2
Supabase schema + authentication

        ↓

STEP 3
Academic graph

        ↓

STEP 4
Study tracking

        ↓

STEP 5
Mastery engine

        ↓

STEP 6
Revision Manager

        ↓

STEP 7
Mistake Bank

        ↓

STEP 8
Quiz Engine

        ↓

STEP 9
Planner

        ↓

STEP 10
Event system

        ↓

STEP 11
n8n automation

        ↓

STEP 12
Sentinel

        ↓

STEP 13
Model Router

        ↓

STEP 14
Research/Tutor

        ↓

STEP 15
Presence

        ↓

STEP 16
Local Agent + Chromium

        ↓

STEP 17
Failover + advanced autonomy
```

---

# 89. Definition of Done — Tillu Core

Tillu Core is complete when it can:

```text
read student state
       ↓
calculate priorities
       ↓
select next action
       ↓
invoke appropriate agent
       ↓
validate result
       ↓
update state
       ↓
schedule next event
```

without requiring manual intervention for the normal workflow.

---

# 90. Definition of Done — Revision Manager

Revision Manager is complete when:

```text
Every learned concept
       ↓
gets revision state
       ↓
receives future review
       ↓
is tested by recall
       ↓
updates its memory state
       ↓
gets rescheduled
```

and forgotten concepts automatically become higher priority.

---

# 91. Definition of Done — Sentinel

Sentinel is complete when it can:

```text
detect agent failure
       ↓
classify failure
       ↓
retry
       ↓
switch provider/fallback
       ↓
record incident
       ↓
restore service
```

without requiring Heoster to manually restart every component.

---

# 92. Definition of Done — Autonomous Tillu

The system is ready for autonomous operation when:

```text
             STUDENT
                 │
                 ▼
             TILLU CORE
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
    LEARN      REVISE     TEST
       │         │         │
       └─────────┼─────────┘
                 ▼
              MEASURE
                 │
                 ▼
               PLAN
                 │
                 ▼
              EXECUTE
                 │
                 ▼
              REPEAT
```

while:

```text
                 SENTINEL
                    │
              watches everything
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
      detect      recover      report
```

---

# Final Technical Architecture

The system I would actually build is therefore:

```text
                         ┌───────────────┐
                         │    HEOSTER    │
                         └───────┬───────┘
                                 │
                          Web / Local UI
                                 │
                    ┌────────────▼────────────┐
                    │       TILLU CORE        │
                    │                         │
                    │ Policy + Orchestration  │
                    └────────────┬────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
       Student State          Agent Hive           Scheduler
            │                    │                    │
            │         ┌──────────┼──────────┐        │
            │         ▼          ▼          ▼        │
            │      Research    Learning    Exam      │
            │      Tutor       Revision    Quiz      │
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                         ┌───────▼───────┐
                         │   SUPABASE    │
                         │               │
                         │ State         │
                         │ Events        │
                         │ Memory        │
                         │ History       │
                         └───────┬───────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
              SENTINEL        MODEL ROUTER       n8n
                │                │                │
          ┌─────┼─────┐      ┌───┼───┐            │
          ▼     ▼     ▼      ▼   ▼   ▼            │
        Health Retry Quality Groq Cerebras OR      │
                                                Automation
                                                   │
                            ┌──────────────────────┘
                            │
                     ┌──────▼──────┐
                     │ LOCAL AGENT │
                     └──────┬──────┘
                            │
                         Playwright
                            │
                         Chromium
                            │
                     Lecture Player
```

### The key architectural decision

**Don't build Tillu as "many AI agents talking to each other."**

Build it as:

> **a deterministic event-driven learning OS with AI agents plugged into it.**

That distinction is what makes the ₹0 architecture feasible, debuggable, recoverable, and capable of surviving individual free services going down.

And the most important technical rule is:

> **The Hive can think, but Supabase + deterministic services own the truth.**
