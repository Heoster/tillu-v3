# TILLU — Requirements Matrix

> Source documents: PRD v1.0 · TRD v1.0 · App Flow v1.0  
> Last updated: Phase 0

Each requirement is tagged with a unique ID, its source, the build phase it belongs to, and its current implementation status.

**Status legend**
- `planned` — defined, not started
- `stubbed` — skeleton exists, no logic
- `partial` — logic exists, not complete
- `implemented` — complete and tested
- `deferred` — intentionally moved to a later phase

---

## AUTH — Authentication & Identity

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| AUTH-001 | User can create an account | `apps/api` → AuthService | `users` | `POST /auth/register` | Sign-up screen | `auth.spec.ts` | 1 | planned |
| AUTH-002 | User can sign in | `apps/api` → AuthService | `users` | `POST /auth/login` | Sign-in screen | `auth.spec.ts` | 1 | planned |
| AUTH-003 | JWT session management | `packages/auth` | `users` | All routes | — | `auth.spec.ts` | 1 | planned |
| AUTH-004 | Row-level security on all tables | Supabase RLS | All tables | Enforced by DB | — | `rls.spec.ts` | 1 | planned |
| AUTH-005 | Service-role key never exposed to frontend | `apps/api` only | — | Server-side only | — | security audit | 1 | planned |

---

## PROF — Student Profile

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| PROF-001 | Student selects Class 12 CBSE during onboarding | ProfileService | `student_profiles` | `POST /profile` | Onboarding screen | `profile.spec.ts` | 1 | planned |
| PROF-002 | Student selects subjects | ProfileService | `student_profiles`, `subjects` | `PUT /profile/subjects` | Subject selector | `profile.spec.ts` | 1 | planned |
| PROF-003 | Student enters exam dates | ProfileService | `student_profiles` | `PUT /profile/dates` | Date picker | `profile.spec.ts` | 1 | planned |
| PROF-004 | Student sets availability windows | ProfileService | `student_preferences` | `PUT /profile/availability` | Schedule builder | `profile.spec.ts` | 1 | planned |
| PROF-005 | System distinguishes configured vs observed vs inferred preference | ProfileService | `student_preferences` | read-only meta | — | `profile.spec.ts` | 1 | planned |

---

## SYL — Syllabus & Academic Graph

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| SYL-001 | Pre-seeded CBSE Class 12 subjects/chapters/concepts | seed scripts | `subjects`, `chapters`, `concepts` | `GET /syllabus` | Study → Chapters | `syllabus.spec.ts` | 1 | planned |
| SYL-002 | Concept has prerequisites and related concepts | SyllabusService | `concepts` | `GET /concepts/:id` | Concept detail | `syllabus.spec.ts` | 1 | planned |
| SYL-003 | Concept has importance weight (board relevance) | SyllabusService | `concepts` | `GET /concepts/:id` | — | `syllabus.spec.ts` | 1 | planned |
| SYL-004 | Source provenance recorded on syllabus data | SyllabusService | `concepts` | — | — | — | 1 | planned |

---

## STUDY — Study Tracker

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| STU-001 | Student can start a study session | StudyService | `study_sessions` | `POST /sessions/start` | Focus Mode | `study.spec.ts` | 1 | planned |
| STU-002 | Student can end/pause a study session | StudyService | `study_sessions` | `POST /sessions/:id/end` | Focus Mode | `study.spec.ts` | 1 | planned |
| STU-003 | Session tracks planned vs actual duration | StudyService | `study_sessions` | — | — | `study.spec.ts` | 1 | planned |
| STU-004 | Lecture watched ≠ concept mastered (exposure evidence only) | StudyService | `study_sessions` | — | — | `study.spec.ts` | 1 | planned |
| STU-005 | SESSION_STARTED and SESSION_COMPLETED events emitted | EventBus | `events` | — | — | `events.spec.ts` | 1 | planned |

---

## MAST — Mastery Engine

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| MAST-001 | Every concept has a mastery score | MasteryService | `mastery_states` | `GET /mastery/:concept_id` | Progress screen | `mastery.spec.ts` | 2 | planned |
| MAST-002 | Mastery is calculated deterministically from evidence | MasteryService | `mastery_events` | — | — | `mastery.spec.ts` | 2 | planned |
| MAST-003 | AI cannot directly write final mastery value | MasteryService (guard) | `mastery_states` | — | — | `mastery-invariants.spec.ts` | 2 | planned |
| MAST-004 | Mastery algorithm is versioned (`mastery_algorithm_version`) | MasteryService | `mastery_states` | — | — | `mastery.spec.ts` | 2 | planned |
| MAST-005 | Mastery inputs: recall, quiz, PYQ, test, mistakes, recency | MasteryService | `mastery_events` | — | — | `mastery.spec.ts` | 2 | planned |
| MAST-006 | MASTERY_UPDATED event emitted on every change | EventBus | `events` | — | — | `events.spec.ts` | 2 | planned |
| MAST-007 | Mastery breakdown visible to student (recall %, practice %, PYQ %) | MasteryService | `mastery_states` | `GET /mastery/:id/breakdown` | Progress screen | `mastery.spec.ts` | 2 | planned |

---

## REV — Revision Manager

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| REV-001 | Revision automatically scheduled after concept exposure | RevisionService | `revision_items` | `POST /revision/schedule` | Revision tab | `revision.spec.ts` | 3 | planned |
| REV-002 | Revision uses adaptive spaced-repetition | RevisionService | `revision_items` | — | — | `revision.spec.ts` | 3 | planned |
| REV-003 | Revision algorithm is versioned | RevisionService | `revision_items` | — | — | `revision.spec.ts` | 3 | planned |
| REV-004 | REVISION_DUE event emitted when review date arrives | EventBus | `events` | — | Revision tab | `revision.spec.ts` | 3 | planned |
| REV-005 | Recall success/failure updates next review date | RevisionService | `revision_events` | `POST /revision/:id/complete` | Revision session | `revision.spec.ts` | 3 | planned |
| REV-006 | Forgetting risk calculated per concept | RevisionService | `mastery_states` | `GET /revision/radar` | Forgetting Radar | `revision.spec.ts` | 3 | planned |
| REV-007 | Revision distinguishes STUDIED from ACTUALLY REMEMBERED | RevisionService | `revision_events` | — | — | `revision-invariants.spec.ts` | 3 | planned |
| REV-008 | Revision dashboard shows: due now, coming up, memory health | — | — | `GET /revision/dashboard` | Revision tab | `revision.spec.ts` | 3 | planned |

---

## MIST — Mistake Bank

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| MIS-001 | Every wrong answer creates a structured mistake record | MistakeService | `mistakes` | `POST /mistakes` | Quiz result | `mistakes.spec.ts` | 4 | planned |
| MIS-002 | Mistake classified by error type (10 categories) | MistakeService | `mistakes` | — | Mistake Bank | `mistakes.spec.ts` | 4 | planned |
| MIS-003 | Repeated mistakes detected and grouped into patterns | MistakeService | `mistake_patterns` | `GET /mistakes/patterns` | Mistake Bank | `mistakes.spec.ts` | 4 | planned |
| MIS-004 | Pattern triggers repair session | RepairService | `mistake_patterns` | `POST /repair/start` | Repair screen | `mistakes.spec.ts` | 4 | planned |
| MIS-005 | MISTAKE_CREATED and MISTAKE_PATTERN_DETECTED events emitted | EventBus | `events` | — | — | `events.spec.ts` | 4 | planned |
| MIS-006 | Mistake affects mastery and revision priority | MasteryService + RevisionService | `mastery_events` | — | — | `mistakes.spec.ts` | 4 | planned |

---

## QUIZ — Quiz Engine

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| QUIZ-001 | Daily quiz auto-generated each morning | QuizAgent + n8n | `quizzes` | `GET /quiz/daily` | Home screen | `quiz.spec.ts` | 5 | planned |
| QUIZ-002 | Quiz parameters: subject, concept, difficulty, weakness, mistakes | QuizAgent | `quizzes` | `POST /quiz/generate` | Quiz screen | `quiz.spec.ts` | 5 | planned |
| QUIZ-003 | All AI-generated quiz output validated by schema | QuizAgent | — | — | — | `quiz-validation.spec.ts` | 5 | planned |
| QUIZ-004 | Quiz supports 7 modes (daily/quick/revision/weakness/mixed/PYQ/exam) | QuizAgent | `quizzes` | `POST /quiz/generate` | Quiz screen | `quiz.spec.ts` | 5 | planned |
| QUIZ-005 | QUIZ_COMPLETED event triggers mastery + mistake + revision update | EventBus | `events` | — | — | `events.spec.ts` | 5 | planned |
| QUIZ-006 | Invalid AI output retried then falls back deterministically | ModelRouter | — | — | — | `fallback.spec.ts` | 5 | planned |

---

## PLAN — Adaptive Planner

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| PLAN-001 | Daily plan generated automatically | PlannerAgent | `daily_plans`, `plan_items` | `GET /plan/today` | Plan tab | `planner.spec.ts` | 6 | planned |
| PLAN-002 | Plan respects hard constraints (sleep, exam, school) | PlannerAgent | `student_preferences` | — | — | `planner.spec.ts` | 6 | planned |
| PLAN-003 | Total scheduled time never exceeds available time without warning | PlannerAgent | `daily_plans` | — | — | `planner-invariants.spec.ts` | 6 | planned |
| PLAN-004 | Missed task triggers replanning, not guilt | RecoveryPlanner | `daily_plans` | `POST /plan/recover` | Plan tab | `planner.spec.ts` | 6 | planned |
| PLAN-005 | PLAN_CREATED and PLAN_CHANGED events emitted | EventBus | `events` | — | — | `events.spec.ts` | 6 | planned |
| PLAN-006 | Replanning threshold prevents constant churn | PlannerAgent | — | — | — | `planner.spec.ts` | 6 | planned |
| PLAN-007 | Opportunistic micro-tasks for 5/10/15/30-min windows | OpportunisticEngine | `plan_items` | `GET /plan/opportunity` | Home screen | `planner.spec.ts` | 6 | planned |

---

## NBA — Next Best Action

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| NBA-001 | Home screen shows Next Best Action at all times | NBAEngine | `daily_plans` | `GET /nba` | Home screen | `nba.spec.ts` | 7 | planned |
| NBA-002 | NBA considers: mastery, revision urgency, mistakes, deadlines, time | NBAEngine | multiple | `GET /nba` | Home screen | `nba.spec.ts` | 7 | planned |
| NBA-003 | NBA includes human-readable reason (why this, why now) | NBAEngine | — | `GET /nba` | Home screen | `nba.spec.ts` | 7 | planned |
| NBA-004 | NBA updates when student context changes (presence, completion) | NBAEngine | `presence_state` | — | — | `nba.spec.ts` | 7 | planned |

---

## PRES — Presence Engine

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| PRES-001 | 6 presence states: UNKNOWN/AVAILABLE/STUDYING/AWAY/SLEEPING/OFFLINE | PresenceAgent | `presence_state` | `GET /presence` | Home status | `presence.spec.ts` | 4 | planned |
| PRES-002 | Presence includes confidence score (never claims certainty) | PresenceAgent | `presence_state` | — | — | `presence-invariants.spec.ts` | 4 | planned |
| PRES-003 | Presence affects notification decisions | NotificationService | `presence_state` | — | — | `notifications.spec.ts` | 4 | planned |
| PRES-004 | No webcam/microphone/keylogger used by default | PresenceAgent | — | — | — | privacy audit | 4 | planned |

---

## LEC — Lecture Player

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| LEC-001 | Approved playlists stored per chapter | LectureService | `playlists`, `lectures` | `GET /lectures/:chapter_id` | Lectures screen | `lecture.spec.ts` | 4 | planned |
| LEC-002 | Local agent opens Chromium on approved domain only | LocalAgent | `lecture_progress` | — | — | `local-agent.spec.ts` | 4 | planned |
| LEC-003 | Lecture progress (position, completion) tracked continuously | LectureService | `lecture_progress` | `PUT /lectures/:id/progress` | — | `lecture.spec.ts` | 4 | planned |
| LEC-004 | Resume from last position on return | LectureService | `lecture_progress` | `GET /lectures/:id/resume` | Lectures screen | `lecture.spec.ts` | 4 | planned |
| LEC-005 | LECTURE_COMPLETED triggers recall questions | EventBus + QuizAgent | `events` | — | Post-lecture screen | `lecture-e2e.spec.ts` | 4 | planned |
| LEC-006 | Local agent has emergency stop | LocalAgent | — | `POST /local/stop` | Settings | `local-agent.spec.ts` | 4 | planned |

---

## RES — Research Agent

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| RES-001 | Research decomposes query into parallel searches | ResearchAgent | `research_queries` | `POST /research` | Research screen | `research.spec.ts` | 2 | planned |
| RES-002 | Every claim linked to a source with confidence | ResearchAgent | `research_sources`, `research_claims` | — | — | `research.spec.ts` | 2 | planned |
| RES-003 | Unsupported AI claims not silently promoted to facts | ResearchAgent | `research_claims` | — | — | `research-invariants.spec.ts` | 2 | planned |
| RES-004 | Research output feeds Quiz/Revision system | EventBus | `events` | — | — | `research-e2e.spec.ts` | 2 | planned |

---

## TUTOR — Tutor Agent

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| TUT-001 | Tutor guides with hints before giving answer | TutorAgent | — | `POST /tutor/ask` | Tutor screen | `tutor.spec.ts` | 2 | planned |
| TUT-002 | Explicit "show answer" available on demand | TutorAgent | — | `POST /tutor/reveal` | Tutor screen | `tutor.spec.ts` | 2 | planned |
| TUT-003 | Tutor suggests similar question after explanation | TutorAgent | `questions` | `GET /tutor/similar` | Tutor screen | `tutor.spec.ts` | 2 | planned |

---

## FORM — Formula Manager

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| FORM-001 | Formula vault seeded per subject/chapter | FormulaService | `formulas` | `GET /formulas` | Formula Vault | `formula.spec.ts` | 2 | planned |
| FORM-002 | Recall is primary operation (produce formula from memory) | FormulaAgent | `formula_reviews` | `POST /formulas/:id/recall` | Formula Vault | `formula.spec.ts` | 2 | planned |
| FORM-003 | Daily formula recall list auto-generated | FormulaAgent + n8n | `formula_reviews` | `GET /formulas/daily` | Home screen | `formula.spec.ts` | 2 | planned |

---

## SENT — Sentinel

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| SENT-001 | Every agent exposes GET /health, /ready, /version, POST /test | All agents | `agent_heartbeats` | standard contract | — | `sentinel.spec.ts` | 3 | planned |
| SENT-002 | Sentinel polls all agents and records heartbeat | SentinelAgent | `agent_heartbeats` | `GET /sentinel/status` | Health dashboard | `sentinel.spec.ts` | 3 | planned |
| SENT-003 | Sentinel runs synthetic tests periodically | SentinelAgent | `agent_tests` | — | Health dashboard | `sentinel.spec.ts` | 3 | planned |
| SENT-004 | Agent health score calculated (liveness 30%, correctness 40%, reliability 20%, latency 10%) | SentinelAgent | `agents` | `GET /sentinel/agents` | Health dashboard | `sentinel.spec.ts` | 3 | planned |
| SENT-005 | Failed agent triggers retry → fallback → notify | SentinelAgent + RecoveryService | `agent_failures` | — | — | `recovery.spec.ts` | 3 | planned |
| SENT-006 | System health dashboard shows all components | — | — | `GET /sentinel/dashboard` | System Health screen | `sentinel.spec.ts` | 3 | planned |

---

## MODEL — Model Router

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| MDL-001 | All AI calls go through ModelRouter, never direct provider calls | `packages/model-router` | — | internal | — | `model-router.spec.ts` | 3 | planned |
| MDL-002 | Provider adapters: Groq, Cerebras, OpenRouter, HF | `packages/model-router/adapters` | — | — | — | `model-router.spec.ts` | 3 | planned |
| MDL-003 | Fallback to next provider on failure | ModelRouter | — | — | — | `fallback.spec.ts` | 3 | planned |
| MDL-004 | Circuit breaker per provider | ModelRouter | — | — | — | `circuit-breaker.spec.ts` | 3 | planned |
| MDL-005 | Router tracks latency, tokens, failure rate | ModelRouter | `provider_metrics` (in-memory initially) | — | Health dashboard | `model-router.spec.ts` | 3 | planned |

---

## QUOTA — Quota Guardian

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| QUOT-001 | Track tokens, API calls, provider limits | QuotaGuardian | `quota_events` | `GET /quota/status` | Health dashboard | `quota.spec.ts` | 3 | planned |
| QUOT-002 | Three modes: NORMAL / CONSERVE / EMERGENCY | QuotaGuardian | — | — | — | `quota.spec.ts` | 3 | planned |
| QUOT-003 | Emergency mode reduces AI generation, uses deterministic fallbacks | QuotaGuardian | — | — | — | `quota.spec.ts` | 3 | planned |

---

## NOTIF — Notifications

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| NOTIF-001 | Notification pipeline: event → importance → presence → quiet hours → dedupe → send/queue/suppress | NotificationService | `notifications` | — | Notification center | `notifications.spec.ts` | 3 | planned |
| NOTIF-002 | Deduplicate using composite key (event_type + concept_id + date) | NotificationService | `notifications` | — | — | `notifications.spec.ts` | 3 | planned |
| NOTIF-003 | Student can disable all proactive notifications | ProfileService | `student_preferences` | `PUT /profile/notifications` | Settings | `notifications.spec.ts` | 3 | planned |

---

## EVT — Event System

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| EVT-001 | All important state changes emit events | EventBus | `events` | — | — | `events.spec.ts` | 1 | planned |
| EVT-002 | Events are idempotent (duplicate safe) | EventBus | `events` | — | — | `events.spec.ts` | 1 | planned |
| EVT-003 | Events are versioned and traceable (request_id, trace_id) | EventBus | `events` | — | — | `events.spec.ts` | 1 | planned |
| EVT-004 | Append-only event log for audit/rebuild | EventBus | `events` | — | — | `events.spec.ts` | 1 | planned |

---

## INV — Critical Invariants (from TRD §86)

| ID | Invariant | Enforced by | Test |
|----|-----------|-------------|------|
| INV-001 | AI cannot directly modify marks | MasteryService guard | `mastery-invariants.spec.ts` |
| INV-002 | AI cannot directly change historical study records | StudyService guard | `study-invariants.spec.ts` |
| INV-003 | Revision scheduling reproducible from stored state | RevisionService | `revision-invariants.spec.ts` |
| INV-004 | Duplicate events don't duplicate study history | EventBus idempotency | `events.spec.ts` |
| INV-005 | Failed AI provider doesn't destroy a workflow | ModelRouter + RecoveryService | `fallback.spec.ts` |
| INV-006 | Local agent is always disableable | LocalAgent | `local-agent.spec.ts` |
| INV-007 | Student can override any automated plan | PlannerAgent | `planner.spec.ts` |
| INV-008 | No agent accesses data beyond its permissions | RLS + service auth | `rls.spec.ts` |
| INV-009 | Presence inference never represented as certainty | PresenceAgent | `presence-invariants.spec.ts` |
| INV-010 | No autonomous workflow creates unbounded task loop | RecoveryPlanner | `planner-invariants.spec.ts` |
