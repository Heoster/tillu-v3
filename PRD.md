Absolutely. Below is a **master PRD for Tillu**, written as a build-ready product requirements document rather than just an idea document.

# TILLU — Product Requirements Document

**Product:** Tillu — Autonomous Personal Study Environment
**Version:** PRD v1.0
**Target User:** Class 12 CBSE student preparing for Board examinations
**Infrastructure Target:** ₹0/month initially
**Primary Goal:** Build an autonomous, adaptive study companion that researches, plans, teaches, tests, tracks, revises, and continuously monitors its own reliability.

---

# 1. Product Vision

### Vision

> **Tillu is an autonomous Personal Study OS that understands what the student needs to learn, what they actually remember, what they are weak at, when they are available, and what should happen next.**

Tillu should not merely answer questions.

It should continuously operate this loop:

**Observe → Understand → Research → Plan → Act → Measure → Revise → Replan**

while maintaining a persistent student knowledge state.

---

# 2. Problem Statement

Class 12 students face several interconnected problems:

* Syllabus is large and difficult to manage.
* Students confuse lecture completion with learning.
* Previously studied topics are forgotten.
* Revision is often irregular.
* Weak chapters aren't always obvious.
* Students don't know what to study next.
* Study plans break when real-life schedules change.
* Mistakes repeat because they aren't systematically tracked.
* Tests often measure marks but don't produce an actionable recovery plan.
* Educational AI tools generally respond to requests instead of proactively managing learning.
* Multiple AI services are difficult to coordinate reliably.
* Free infrastructure can sleep, fail, rate-limit, or disappear.

Tillu addresses these as **one integrated system**.

---

# 3. Product Principles

### P1 — Learning > Activity

Tillu must optimize for:

> **What the student can recall and apply.**

Not:

> How many hours the app was open.

### P2 — Evidence > Self-confidence

Student mastery must be inferred from evidence:

* Recall
* Questions
* PYQs
* Tests
* Mistakes
* Repeated performance

### P3 — Adaptive > Static

Plans must change according to:

* Availability
* Time
* Deadlines
* Weakness
* Revision requirements
* Completed work

### P4 — AI is not the source of truth

Deterministic systems should own:

* Marks
* Dates
* Time
* Progress
* Task states
* Calculations
* Events

AI should primarily handle:

* Reasoning
* Explanation
* Generation
* Research synthesis
* Recommendations

### P5 — Failure is normal

Every AI/hosting dependency must have:

* Timeout
* Retry
* Validation
* Fallback
* Logging
* Health monitoring

### P6 — Don't punish the student

Missed plans should result in **replanning**, not guilt.

---

# 4. Target User

## Primary Persona

**Class 12 CBSE student**

Needs:

* Board preparation
* Syllabus management
* Lecture management
* Revision
* PYQs
* Testing
* Formula/reaction recall
* Weakness identification
* Study planning
* Progress tracking

---

# 5. Product Goals

## Must achieve

1. Maintain a complete academic state.
2. Maintain concept-level mastery.
3. Automatically create adaptive study plans.
4. Automatically schedule revision.
5. Generate daily quizzes.
6. Track mistakes.
7. Track tests and marks.
8. Research academic topics.
9. Track lectures.
10. Adapt plans to availability.
11. Monitor agent health.
12. Provide fallback behavior.
13. Operate within ₹0 infrastructure initially.

## Non-goals for MVP

* Replacing teachers.
* Guaranteed official CBSE marking.
* Fully autonomous control of the user's computer without explicit permission.
* Medical/psychological diagnosis.
* Unlimited background AI computation.
* Building every possible education feature before the core learning loop works.

---

# 6. High-Level Architecture

```text
                         STUDENT
                            │
                            ▼
                     TILLU INTERFACE
                            │
                            ▼
                    ┌───────────────┐
                    │   TILLU CORE  │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   STUDENT STATE          AGENTS             AUTOMATION
        │                   │                   │
        ▼                   ▼                   ▼
    Supabase             Agent Hive             n8n
        │                   │
        │        ┌──────────┼──────────┐
        │        ▼          ▼          ▼
        │    Research     Tutor      Revision
        │
        └──────────────────────┐
                               ▼
                         SENTINEL
                     Health & Recovery
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
              Cloud          Cloud          Local
             Agents         Agents          Agent
                                             │
                                          Chromium
```

---

# 7. Core Product Modules

## Module A — Student Profile

Stores:

* Subjects
* Class
* Board
* Academic goals
* Exam dates
* Study preferences
* Available time
* Preferred study windows
* Sleep schedule
* Optional energy/focus information

### Requirement

The system must distinguish between:

```text
Configured preference
Observed behavior
AI inference
```

These must never be silently mixed.

---

# 8. Module B — CBSE Academic Knowledge Base

Tillu maintains:

```text
Board
 ↓
Class
 ↓
Subject
 ↓
Unit
 ↓
Chapter
 ↓
Concept
 ↓
Sub-concept
```

Each concept may contain:

* Definition
* Formula
* Reaction
* Example
* Prerequisites
* Related concepts
* PYQs
* Notes
* Revision status

### Source hierarchy

Prefer authoritative sources for syllabus/exam information.

Tillu should record:

```text
source
retrieved_at
source_type
confidence
```

---

# 9. Module C — Study Tracker

Track:

* Study sessions
* Start/end time
* Subject
* Chapter
* Concept
* Activity type
* Planned duration
* Actual duration
* Completion
* Focus/session state

### Critical distinction

```text
Lecture watched
≠
Concept learned
```

Watching a lecture should create **exposure evidence**, not mastery.

---

# 10. Module D — Mastery Engine

Every concept gets a dynamic mastery score.

Example:

```text
Concept: Integration

Exposure       100%
Recall          63%
Practice        57%
PYQ             48%
Exam execution  42%

Overall mastery: 51%
```

The exact scoring formula should remain configurable.

### Inputs

* Recall results
* Quiz results
* PYQs
* Tests
* Mistakes
* Time since last successful recall
* Difficulty
* Repeated failures

---

# 11. Module E — Revision Manager

### Objective

Ensure previously learned material remains retrievable.

Revision Manager maintains:

```text
learned_at
last_reviewed
last_recalled
recall_success_rate
forgetting_risk
revision_priority
next_review
```

### Revision types

1. Quick recall
2. Formula recall
3. Reaction recall
4. Flashcards
5. Concept explanation
6. PYQ
7. Mixed practice
8. Mock test

### Requirement

Revision must be primarily **retrieval-based**, not simply rereading.

---

# 12. Module F — Forgetting Radar

Tillu continuously identifies concepts at risk.

Example:

```text
FORGETTING RADAR

🔴 Integration
🔴 Ray Optics
🟡 Electrochemistry
🟡 Matrices
🟢 Probability
```

### Inputs

* Time since review
* Historical forgetting
* Recent performance
* Importance
* Number of previous failures

---

# 13. Module G — Mistake Bank

Every meaningful mistake should become structured data.

```text
Mistake
 ├── Subject
 ├── Chapter
 ├── Concept
 ├── Question
 ├── Error type
 ├── Cause
 ├── Severity
 ├── Attempt
 └── Resolution
```

### Error categories

* Conceptual
* Formula
* Calculation
* Sign
* Unit
* Misreading
* Memory
* Carelessness
* Time pressure
* Answer presentation

---

# 14. Module H — Knowledge Repair

When repeated mistakes occur:

```text
Mistake
 ↓
Detect pattern
 ↓
Identify misconception
 ↓
Micro lesson
 ↓
Easy question
 ↓
Medium question
 ↓
PYQ
 ↓
Delayed recall
```

The system should avoid forcing the student to relearn an entire chapter unnecessarily.

---

# 15. Module I — Quiz Engine

Daily automatic quiz generation.

Quiz generation parameters:

* Subject
* Chapter
* Concept
* Difficulty
* Weakness
* Revision due
* Previous mistakes
* Exam relevance

### Quiz modes

* Daily quiz
* Quick quiz
* Revision quiz
* Weakness quiz
* Mixed quiz
* PYQ quiz
* Exam simulation

---

# 16. Module J — Formula & Reaction Manager

Tillu automatically extracts important:

* Formulas
* Reactions
* Definitions
* Constants
* Theorems
* Rules
* Exceptions

Then schedules recall.

Example:

```text
Today's Formula Recall

1. Lens formula
2. Nernst equation
3. Integration identities
4. Probability theorem
```

The student should be asked to **produce the formula**, not simply view it.

---

# 17. Module K — Research Agent

Research Agent performs:

```text
Question
 ↓
Parallel search
 ↓
Source collection
 ↓
Source validation
 ↓
Cross-check
 ↓
Synthesis
 ↓
Answer
```

Each research result should maintain provenance.

```text
claim
source
retrieval time
confidence
```

---

# 18. Module L — Tutor Agent

Tillu should support:

* Explanation
* Socratic questioning
* Examples
* Analogies
* Concept decomposition
* Doubt solving
* Guided problem solving

### Important behavior

When appropriate, Tutor should **not immediately give the answer**.

It should guide recall and reasoning.

---

# 19. Module M — Exam Engine

Supports:

### Chapter tests

### Subject tests

### Full mocks

### PYQs

### Timed practice

Tracks:

* Accuracy
* Time/question
* Marks
* Question type
* Error type
* Chapter
* Concept

After every major test:

```text
TEST
 ↓
ANALYSIS
 ↓
WEAKNESS DETECTION
 ↓
MISTAKE UPDATE
 ↓
REVISION UPDATE
 ↓
PLAN UPDATE
```

---

# 20. Module N — Answer-Writing Evaluator

Evaluate:

* Completeness
* Structure
* Key concepts
* Terminology
* Steps
* Units
* Diagrams
* Presentation

Output:

```text
Estimated performance
+
Missing elements
+
Improvement suggestions
```

It must clearly distinguish an **AI estimate** from an official marking decision.

---

# 21. Module O — Adaptive Planner

Tillu must maintain two kinds of tasks:

### Fixed

```text
Exam
School
Coaching
Sleep
```

### Flexible

```text
Revision
Practice
Quiz
Lecture
PYQ
```

The planner protects fixed commitments and dynamically rearranges flexible work.

---

# 22. Module P — Presence Engine

The system determines an approximate availability state using explicitly permitted signals.

States:

```text
AVAILABLE
STUDYING
BUSY
AWAY
OFFLINE
SLEEPING
UNKNOWN
```

### Critical requirement

Tillu must **not claim certainty** about the user's physical presence.

Example:

```text
Laptop online
≠
Student present
```

Presence should include confidence.

```text
Presence:
AVAILABLE
Confidence:
0.82
```

---

# 23. Module Q — Next Best Action

At any point Tillu calculates:

```text
Available time
+
Current context
+
Mastery
+
Revision urgency
+
Exam importance
+
Deadlines
+
Recent mistakes
+
Student state
```

Output:

> **Next Best Action**

Example:

> Do 8 Integration PYQs for 35 minutes.

This should become the primary action recommendation instead of showing an overwhelming task list.

---

# 24. Module R — Opportunistic Study

Tillu should recognize available time windows.

```text
5 min
→ Formula recall

10 min
→ Quick quiz

15 min
→ Mistake review

30 min
→ PYQs

60 min
→ Deep study
```

This allows study to fit around real life.

---

# 25. Module S — Recovery Planner

When a task is missed:

```text
Missed task
 ↓
Evaluate importance
 ↓
Recalculate remaining time
 ↓
Move / merge / reduce / delete
 ↓
Generate new plan
```

No backlog explosion.

---

# 26. Module T — Lecture Player

Local agent controls an explicitly authorized Chromium environment.

Capabilities:

* Open approved YouTube playlists
* Store chapter/lecture mapping
* Track progress
* Resume last position
* Record completion
* Associate lecture with concept/chapter

### Security

Tillu must not autonomously perform arbitrary browser actions outside the approved scope.

---

# 27. Module U — Sentinel

Sentinel monitors every agent.

### Health levels

```text
Liveness
Readiness
Correctness
Quality
```

### Agent endpoints

```text
/health
/ready
/test
/run
/version
```

### Monitoring

```text
heartbeat
latency
failure rate
validation errors
dependency status
quality metrics
```

---

# 28. Module V — Self-Healing

Failure pipeline:

```text
Failure
 ↓
Retry
 ↓
Timeout
 ↓
Alternative provider
 ↓
Fallback agent
 ↓
Deterministic fallback
 ↓
Notify if critical
```

---

# 29. Module W — Agent Registry

Database:

```text
agents

id
name
version
host
endpoint
enabled
priority
health_status
health_score
last_heartbeat
last_success
last_failure
failure_count
```

---

# 30. Module X — Autonomous Scheduler

n8n or equivalent automation layer handles scheduled events.

Examples:

```text
06:30 → morning planning
07:00 → daily priorities
12:00 → optional micro revision
18:00 → study adaptation
21:30 → daily review
23:30 → health check
```

Exact schedules must be configurable.

---

# 31. Module Y — Daily Intelligence Cycle

Every day:

```text
00:00
 ↓
Update academic state
 ↓
Process previous-day performance
 ↓
Update mastery
 ↓
Update forgetting risk
 ↓
Update mistakes
 ↓
Calculate revision
 ↓
Check deadlines
 ↓
Research required topics
 ↓
Generate daily plan
 ↓
Generate quiz
 ↓
Generate formula recall
 ↓
Wait for student context
 ↓
Adapt continuously
```

---

# 32. Module Z — Daily System Health Cycle

Separately:

```text
Heartbeat checks
 ↓
Dependency checks
 ↓
Synthetic tests
 ↓
Quality checks
 ↓
Failure detection
 ↓
Automatic recovery
 ↓
Health report
```

---

# 33. Data Model

Core tables:

```text
users
student_profiles

subjects
chapters
concepts

study_sessions
study_tasks

mastery_states
revision_items
revision_events

mistakes
mistake_patterns

questions
quiz_sessions
quiz_answers

tests
test_questions
test_results

lectures
playlists
lecture_progress

research_queries
research_sources
research_claims

formulas
reactions
recall_events

agent_registry
agent_heartbeats
agent_tests
agent_failures

workflow_runs
events
notifications

student_presence
student_preferences
daily_plans
```

---

# 34. Event Architecture

Tillu should be event-driven.

Example:

```text
LECTURE_COMPLETED
        ↓
CONCEPT_EXPOSED
        ↓
RECALL_SCHEDULED
        ↓
RECALL_COMPLETED
        ↓
MASTERY_UPDATED
        ↓
REVISION_SCHEDULED
```

Another:

```text
QUIZ_FAILED
 ↓
MISTAKE_CREATED
 ↓
WEAKNESS_UPDATED
 ↓
REVISION_PRIORITY_CHANGED
 ↓
PLAN_UPDATED
```

---

# 35. AI Model Router

Tillu should not hard-code one model.

```text
                    MODEL ROUTER
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
         Groq         Cerebras      OpenRouter
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                    Task Selection
```

Different tasks can use different models.

### Example

Cheap/fast:

* Classification
* Formatting
* Simple quiz generation

More capable:

* Research synthesis
* Complex tutoring
* Planning

---

# 36. ₹0 Infrastructure Requirements

Initial architecture must prioritize free resources.

Potential categories:

```text
Supabase
→ state/database

n8n/free automation
→ orchestration

Free cloud hosts
→ agent endpoints

Hugging Face Spaces
→ selected AI services/UI

Local computer
→ Chromium + local agent

Groq/Cerebras/OpenRouter
→ model routing
```

**Provider selection must be verified against current free-tier limits before implementation**, because free tiers change.

---

# 37. Reliability Requirements

Every external dependency must support:

```text
timeout
retry
backoff
validation
logging
fallback
```

No single AI model may be a critical single point of failure.

---

# 38. Deterministic Fallbacks

### Revision

Use algorithmic scheduling.

### Statistics

Use database calculations.

### Time

Use system time.

### Progress

Use stored events.

### Basic planning

Use rule-based priority.

### Lecture tracking

Use local state.

Therefore:

> **Tillu should degrade gracefully instead of becoming completely useless when AI is unavailable.**

---

# 39. Security Requirements

The system must use:

* Authentication
* Row-level database permissions
* API keys stored as secrets
* Agent authentication
* Least-privilege service access
* Audit logs
* Explicit local-computer permissions
* Safe browser scope
* No unnecessary collection of sensitive data

---

# 40. Privacy Requirements

Presence monitoring should use the minimum information necessary.

Default:

```text
No webcam
No microphone
No screenshots
No keystroke surveillance
```

unless explicitly introduced later with clear permission and a legitimate requirement.

---

# 41. Dashboard Requirements

The home screen should answer five questions immediately:

### 1. What should I do now?

**Next Best Action**

### 2. How am I doing?

**Board Readiness**

### 3. What am I forgetting?

**Forgetting Radar**

### 4. What am I weak at?

**Weakness Map**

### 5. Is Tillu working?

**System Health**

---

# 42. Dashboard Example

```text
┌────────────────────────────────────┐
│           TILLU                    │
│                                    │
│ 🟢 Available                       │
│                                    │
│ NEXT BEST ACTION                   │
│                                    │
│ Physics — Ray Optics               │
│ 35 min PYQ Repair                  │
│                                    │
│ Why?                               │
│ • Mastery: 47%                     │
│ • 3 recent mistakes                │
│ • Revision due                     │
│                                    │
│ [ START ]                          │
│                                    │
├────────────────────────────────────┤
│ BOARD READINESS                    │
│                                    │
│ Coverage       84%                 │
│ Mastery        71%                 │
│ Recall         68%                 │
│ PYQ            73%                 │
│ Exam execution 62%                 │
│                                    │
├────────────────────────────────────┤
│ FORGETTING RADAR                   │
│ 🔴 Integration                     │
│ 🔴 Ray Optics                      │
│ 🟡 Electrochemistry                │
│                                    │
├────────────────────────────────────┤
│ SYSTEM HEALTH                      │
│ Agents 8/8 🟢                      │
│ Workflows 14/14 🟢                 │
└────────────────────────────────────┘
```

---

# 43. Notifications

Notifications should be **contextual and sparse**.

Bad:

> "Study now!"

Good:

> "You have 42 minutes available. Integration is currently your highest-value revision. Start a 30-minute repair session?"

Notification priority:

```text
Critical
 ↓
Exam deadline
 ↓
Important revision
 ↓
High-value study opportunity
 ↓
Everything else
```

---

# 44. User Controls

The student must always be able to:

* Pause automation
* Disable an agent
* Change study availability
* Change sleep window
* Edit plans
* Delete data
* Override recommendations
* Disable local computer control
* Disable proactive notifications

Tillu recommends.

**The student remains in control.**

---

# 45. Acceptance Criteria

Tillu MVP is successful when:

### Learning

* [ ] Concepts can be tracked independently.
* [ ] Mastery changes from actual evidence.
* [ ] Revision is automatically scheduled.
* [ ] Mistakes affect future practice.
* [ ] Daily quizzes are generated.
* [ ] Formula recall works.

### Planning

* [ ] Daily plan generated automatically.
* [ ] Missed tasks trigger replanning.
* [ ] Plan considers availability.
* [ ] Short free periods can generate micro-study tasks.
* [ ] Fixed commitments are protected.

### Research

* [ ] Research tasks can run independently.
* [ ] Sources are recorded.
* [ ] Claims can be traced to sources.

### Lecture

* [ ] Approved playlists are stored.
* [ ] Lecture progress persists.
* [ ] Last position can be resumed.

### Reliability

* [ ] Every agent has heartbeat.
* [ ] Synthetic tests exist.
* [ ] Failed agents are detected.
* [ ] Retries occur.
* [ ] Fallbacks exist.
* [ ] Critical failures are surfaced.

---

# 46. MVP Scope

Do **not** build everything immediately.

### MVP 1

```text
Supabase
+
Authentication
+
Student Profile
+
Subjects/Chapters
+
Study Tracker
+
Basic Mastery
+
Revision Manager
+
Mistake Bank
+
Daily Quiz
+
Basic Planner
+
Dashboard
```

This proves the fundamental learning loop.

---

# 47. MVP 2

Add:

```text
Research Agent
Tutor
Formula Manager
Forgetting Radar
Adaptive Planner
PYQs
Exam Engine
```

---

# 48. MVP 3

Add:

```text
n8n automation
Sentinel
Agent Registry
Health tests
Model router
Failover
Notifications
```

---

# 49. MVP 4

Add:

```text
Local Agent
Chromium
Lecture Player
Presence Engine
Opportunistic Study
Dynamic scheduling
```

---

# 50. V2 Intelligence

Eventually:

```text
Learning Scientist
+
Predictive Mastery
+
Forgetting Forecast
+
Exam Readiness Forecast
+
Learning Strategy Optimization
+
Personalized Model Routing
```

---

# 51. Ultimate Tillu Loop

The final system should behave like this:

```text
                    ┌──────────────┐
                    │    TIME      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   PRESENCE   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ STUDENT STATE│
                    └──────┬───────┘
                           │
             ┌─────────────▼─────────────┐
             │       TILLU CORE          │
             │                           │
             │ What matters most now?    │
             └─────────────┬─────────────┘
                           │
                    NEXT BEST ACTION
                           │
                           ▼
                         ACT
                           │
                           ▼
                        MEASURE
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       MASTERY          MISTAKES         REVISION
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                        REPLAN
                           │
                           └───────────────↺
```

And around the entire system:

```text
                    ┌─────────────────┐
                    │     SENTINEL    │
                    │                 │
                    │ Is Tillu alive? │
                    │ Is it correct?  │
                    │ Is it healthy?  │
                    └─────────────────┘
```

## Product North Star

The single most important metric for Tillu should be:

> **How reliably does Tillu improve the student's ability to recall, solve, and perform in the CBSE Board examination?**

Not:

* Number of agents
* Number of AI calls
* Number of notifications
* Hours the app was open
* Number of features
* Number of workflows

**Tillu wins when Heoster needs to think less about managing study and can spend that mental energy actually learning.**
