# TILLU — Requirements Matrix

> Source documents: PRD v1.0 · TRD v1.0 · App Flow v1.0  
> Last updated: Phase 2 complete

Each requirement maps to component → database → API → UI → test → phase → status.

**Status legend**
- `planned` — defined, not started
- `stubbed` — skeleton exists, no logic
- `partial` — logic exists, not fully complete
- `implemented` — complete and tested
- `deferred` — intentionally moved to a later phase

---

## AUTH — Authentication & Identity

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| AUTH-001 | User can create an account | `AuthService` | `student_profiles` | `POST /auth/register` | `/auth/register` | `auth.service.spec.ts` | 1 | **implemented** |
| AUTH-002 | User can sign in | `AuthService` | `users` (Supabase) | `POST /auth/login` | `/auth/login` | `auth.service.spec.ts` | 1 | **implemented** |
| AUTH-003 | JWT session management via Supabase | `packages/auth` · `requireAuth` middleware | `users` | All protected routes | Browser Supabase client | `auth.service.spec.ts` | 1 | **implemented** |
| AUTH-004 | Row-level security on all tables | Supabase RLS policies | All tables | Enforced by DB | — | migrations 0001/0002 | 1 | **implemented** |
| AUTH-005 | Service-role key never exposed to frontend | `packages/database` · `getServiceClient()` server-only | — | Server-side only | `NEXT_PUBLIC_` vars only | security audit | 1 | **implemented** |

---

## PROF — Student Profile

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| PROF-001 | Student profile created on registration | `ProfileService` | `student_profiles` | `POST /profile` | Onboarding page | `profile.service.spec.ts` | 1 | **implemented** |
| PROF-002 | Student selects subjects | `ProfileService.updateSubjects` | `student_preferences` | `PUT /profile/subjects` | Subject grid (Phase 2 UI) | `profile.service.spec.ts` | 1 | **implemented** |
| PROF-003 | Student enters exam date | `ProfileService.upsertProfile` | `student_profiles.exam_date` | `PUT /profile` | Onboarding page | `profile.service.spec.ts` | 1 | **implemented** |
| PROF-004 | Student sets availability windows | `ProfileService.updateAvailability` | `student_preferences` | `PUT /profile/availability` | Onboarding (Phase 2 UI) | `profile.service.spec.ts` | 1 | **implemented** |
| PROF-005 | Preference source tracked (configured/observed/inferred) | `student_preferences.source` column | `student_preferences` | read meta | — | `profile.service.spec.ts` | 1 | **implemented** |

---

## SYL — Syllabus & Academic Graph

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| SYL-001 | Pre-seeded CBSE Class 12 subjects/chapters/concepts | `supabase/seed/cbse_data.ts` + `run.ts` | `subjects`, `chapters`, `concepts` | `GET /syllabus` | Study → Subject grid | `syllabus.service.spec.ts` | 1 | **implemented** |
| SYL-002 | Concept has prerequisites and related concepts (JSONB) | seed data + `concepts` schema | `concepts.prerequisites`, `concepts.related` | `GET /syllabus/concepts/:id` | Concept detail (Phase 2) | `syllabus.service.spec.ts` | 1 | **implemented** |
| SYL-003 | Concept has importance weight (board relevance 1–5) | seed data + `concepts.importance` | `concepts.importance` | `GET /syllabus/concepts/:id` | Concept list stars | `syllabus.service.spec.ts` | 1 | **implemented** |
| SYL-004 | Source provenance on syllabus data (ncert_cbse / 2024-25) | seed script sets `source`, `source_version` | `concepts.source`, `concepts.source_version` | — | — | seed script | 1 | **implemented** |

---

## STUDY — Study Tracker

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| STU-001 | Student can start a study session | `StudyService.startSession` | `study_sessions` | `POST /sessions/start` | Concept list → Focus mode | `study.service.spec.ts` | 1 | **implemented** |
| STU-002 | Student can pause / resume / end a session | `StudyService.pause/resume/endSession` | `study_sessions` | `POST /sessions/:id/pause|resume|end` | Focus mode controls | `study.service.spec.ts` | 1 | **implemented** |
| STU-003 | Session tracks planned vs actual duration (auto-calculated on end) | `StudyService.endSession` | `study_sessions.actual_duration_min` | — | Focus mode timer | `study.service.spec.ts` | 1 | **implemented** |
| STU-004 | Lecture watched ≠ concept mastered (activity_type = lecture creates exposure only) | `study_sessions.activity_type` | `study_sessions` | — | Focus mode | `study.service.spec.ts` | 1 | **implemented** |
| STU-005 | SESSION_STARTED and SESSION_COMPLETED events emitted to event ledger | `EventBus.emit` in StudyService | `events` | — | — | `study.service.spec.ts` | 1 | **implemented** |
| STU-006 | Today's session summary (total time, session count) | `StudyService.getTodaySummary` | `study_sessions` | `GET /sessions/today` | Home → TodayProgress | `study.service.spec.ts` | 1 | **implemented** |

---

## EVT — Event System

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| EVT-001 | All important state changes emit events | `EventBus.emit` — SESSION_STARTED, SESSION_COMPLETED | `events` | — | — | `event-bus.spec.ts` | 1 | **implemented** |
| EVT-002 | Events are idempotent — duplicate events safe | `EventBus.isProcessed` + `event_consumer_log` | `event_consumer_log` | — | — | `event-bus.spec.ts` INV-004 | 1 | **implemented** |
| EVT-003 | Events carry request_id, trace_id, correlation_id, schema_version | `TilluEventSchema` validation in emit | `events` | — | — | `events.spec.ts` | 1 | **implemented** |
| EVT-004 | Append-only event ledger (no DELETE policy) | RLS: no DELETE on `events` table | `events` | — | — | migration 0001 | 1 | **implemented** |

---

## MAST — Mastery Engine

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| MAST-001 | Every concept has a mastery score | `MasteryService` | `mastery_states` | `GET /mastery/:conceptId` | Progress screen | `mastery.service.spec.ts` | 2 | **implemented** |
| MAST-002 | Mastery calculated deterministically from evidence (EMA weighted: recall 30%, practice 25%, PYQ 25%, exam 20%) | `MasteryService.addEvidence` | `mastery_events` | `POST /mastery/evidence` | — | `mastery.service.spec.ts` | 2 | **implemented** |
| MAST-003 | AI cannot directly write final mastery — INV-001 guard | `MasteryService.assertNotAiDirectWrite` | `mastery_states` | Route guard on `POST /mastery/evidence` | — | `mastery.service.spec.ts` INV-001 | 2 | **implemented** |
| MAST-004 | Mastery algorithm versioned (`mastery_algorithm_version = "v1"`) | `MASTERY_ALGORITHM_VERSION` constant | `mastery_states.mastery_algorithm_version` | — | — | `mastery.service.spec.ts` | 2 | **implemented** |
| MAST-005 | Mastery inputs: recall, practice, pyq, exam evidence types | `AddEvidenceSchema` + `MasteryService` | `mastery_events.evidence` JSONB | `POST /mastery/evidence` | — | `mastery.service.spec.ts` | 2 | **implemented** |
| MAST-006 | MASTERY_UPDATED event emitted on every change | `EventBus.emit` in MasteryService | `events` | — | — | `mastery.service.spec.ts` | 2 | **implemented** |
| MAST-007 | Mastery breakdown with explanation visible to student | `MasteryService.buildBreakdown` | `mastery_states` | `GET /mastery/:conceptId` | Progress screen (Phase 7 UI) | `mastery.service.spec.ts` | 2 | **implemented** |
| MAST-008 | Forgetting risk calculated per concept (0–1 scale) | `MasteryService.computeForgettingRisk` | `mastery_states.forgetting_risk` | `GET /mastery/radar` | Home → Forgetting Radar | `mastery.service.spec.ts` | 2 | **implemented** |

---

## REV — Revision Manager

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| REV-001 | Revision automatically scheduled after concept exposure | `RevisionService` | `revision_items` | `POST /revision/schedule` | Revision tab | `revision.spec.ts` | 3 | planned |
| REV-002 | Revision uses adaptive spaced-repetition | `RevisionService` | `revision_items` | — | — | `revision.spec.ts` | 3 | planned |
| REV-003 | Revision algorithm versioned | `revision_algorithm_version` field | `revision_items` | — | — | `revision.spec.ts` | 3 | planned |
| REV-004 | REVISION_DUE event emitted when review date arrives | `EventBus` | `events` | — | Revision tab | `revision.spec.ts` | 3 | planned |
| REV-005 | Recall success/failure updates next review date | `RevisionService` | `revision_events` | `POST /revision/:id/complete` | Revision session | `revision.spec.ts` | 3 | planned |
| REV-006 | Forgetting risk calculated per concept | `RevisionService` | `mastery_states` | `GET /revision/radar` | Forgetting Radar | `revision.spec.ts` | 3 | planned |
| REV-007 | Studied ≠ Actually Remembered (INV-003) | `RevisionService` guard | `revision_events` | — | — | `revision-invariants.spec.ts` | 3 | planned |
| REV-008 | Revision dashboard: due now, coming up, memory health | — | — | `GET /revision/dashboard` | Revision tab | `revision.spec.ts` | 3 | planned |

---

## MIST — Mistake Bank

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| MIS-001 | Every wrong answer creates a structured mistake record | `MistakeService` | `mistakes` | `POST /mistakes` | Quiz result | `mistakes.spec.ts` | 4 | planned |
| MIS-002 | Mistake classified by 10 error types | `MistakeService` | `mistakes.error_type` | — | Mistake Bank | `mistakes.spec.ts` | 4 | planned |
| MIS-003 | Repeated mistakes grouped into patterns | `MistakeService` | `mistake_patterns` | `GET /mistakes/patterns` | Mistake Bank | `mistakes.spec.ts` | 4 | planned |
| MIS-004 | Pattern triggers repair session | `RepairService` | `mistake_patterns` | `POST /repair/start` | Repair screen | `mistakes.spec.ts` | 4 | planned |
| MIS-005 | MISTAKE_CREATED / MISTAKE_PATTERN_DETECTED events emitted | `EventBus` | `events` | — | — | `events.spec.ts` | 4 | planned |
| MIS-006 | Mistake affects mastery and revision priority | `MasteryService` + `RevisionService` | `mastery_events` | — | — | `mistakes.spec.ts` | 4 | planned |

---

## QUIZ — Quiz Engine

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| QUIZ-001 | Daily quiz auto-generated each morning | `QuizAgent` + n8n | `quizzes` | `GET /quiz/daily` | Home screen | `quiz.spec.ts` | 5 | planned |
| QUIZ-002 | Quiz parameters: subject, concept, difficulty, weakness, mistakes | `QuizAgent` | `quizzes` | `POST /quiz/generate` | Quiz screen | `quiz.spec.ts` | 5 | planned |
| QUIZ-003 | All AI-generated quiz output validated by Zod schema | `QuizAgent` validator | — | — | — | `quiz-validation.spec.ts` | 5 | planned |
| QUIZ-004 | Quiz supports 7 modes | `QuizAgent` | `quizzes` | `POST /quiz/generate` | Quiz screen | `quiz.spec.ts` | 5 | planned |
| QUIZ-005 | QUIZ_COMPLETED → mastery + mistake + revision update (E2E) | `EventBus` chain | `events` | — | — | `quiz-e2e.spec.ts` | 5 | planned |
| QUIZ-006 | Invalid AI output retried then falls back | `ModelRouter` | — | — | — | `fallback.spec.ts` | 5 | planned |

---

## PLAN — Adaptive Planner

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| PLAN-001 | Daily plan generated automatically | `PlannerAgent` | `daily_plans`, `plan_items` | `GET /plan/today` | Plan tab | `planner.spec.ts` | 6 | planned |
| PLAN-002 | Plan respects hard constraints | `PlannerAgent` | `student_preferences` | — | — | `planner.spec.ts` | 6 | planned |
| PLAN-003 | Total scheduled ≤ available time (INV-010) | `PlannerAgent` guard | `daily_plans` | — | — | `planner-invariants.spec.ts` | 6 | planned |
| PLAN-004 | Missed task triggers replanning, not failure | `RecoveryPlanner` | `daily_plans` | `POST /plan/recover` | Plan tab | `planner.spec.ts` | 6 | planned |
| PLAN-005 | PLAN_CREATED / PLAN_CHANGED events emitted | `EventBus` | `events` | — | — | `events.spec.ts` | 6 | planned |
| PLAN-006 | Replanning threshold prevents churn | `PlannerAgent` | — | — | — | `planner.spec.ts` | 6 | planned |
| PLAN-007 | Opportunistic micro-tasks for short windows | `OpportunisticEngine` | `plan_items` | `GET /plan/opportunity` | Home screen | `planner.spec.ts` | 6 | planned |

---

## NBA — Next Best Action

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| NBA-001 | Home screen shows NBA at all times | `NBAEngine` | `daily_plans` | `GET /nba` | Home screen | `nba.spec.ts` | 7 | planned |
| NBA-002 | NBA considers mastery, revision urgency, mistakes, deadlines, time | `NBAEngine` | multiple | `GET /nba` | Home screen | `nba.spec.ts` | 7 | planned |
| NBA-003 | NBA includes human-readable reason | `NBAEngine` | — | `GET /nba` | Home screen | `nba.spec.ts` | 7 | planned |
| NBA-004 | NBA updates when student context changes | `NBAEngine` | `presence_state` | — | — | `nba.spec.ts` | 7 | planned |

---

## PRES — Presence Engine

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| PRES-001 | 6 presence states | `PresenceAgent` | `presence_state` | `GET /presence` | Home status dot | `presence.spec.ts` | 4 | planned |
| PRES-002 | Presence includes confidence (never certainty — INV-009) | `PresenceAgent` | `presence_state.confidence` | — | — | `presence-invariants.spec.ts` | 4 | planned |
| PRES-003 | Presence affects notification decisions | `NotificationService` | `presence_state` | — | — | `notifications.spec.ts` | 4 | planned |
| PRES-004 | No webcam/mic/keylogger by default | `PresenceAgent` design | — | — | — | privacy audit | 4 | planned |

---

## LEC — Lecture Player

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| LEC-001 | Approved playlists stored per chapter | `LectureService` | `playlists`, `lectures` | `GET /lectures/:chapter_id` | Lectures screen | `lecture.spec.ts` | 4 | planned |
| LEC-002 | Local agent opens Chromium on approved domains only | `LocalAgent` Playwright | `lecture_progress` | — | — | `local-agent.spec.ts` | 4 | planned |
| LEC-003 | Lecture progress continuously tracked | `LectureService` | `lecture_progress` | `PUT /lectures/:id/progress` | — | `lecture.spec.ts` | 4 | planned |
| LEC-004 | Resume from last position | `LectureService` | `lecture_progress` | `GET /lectures/:id/resume` | Lectures screen | `lecture.spec.ts` | 4 | planned |
| LEC-005 | LECTURE_COMPLETED triggers recall questions | `EventBus` + `QuizAgent` | `events` | — | Post-lecture screen | `lecture-e2e.spec.ts` | 4 | planned |
| LEC-006 | Local agent has emergency stop | `LocalAgent` | — | `POST /local/stop` | Settings | `local-agent.spec.ts` | 4 | planned |

---

## RES — Research Agent

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| RES-001 | Research validates and stores sourced claims | `ResearchAgent.handleResearch` | `research_queries`, `research_sources`, `research_claims` | `POST /run` (agent) | Research screen (Phase 4 UI) | `schemas.spec.ts` | 2 | **implemented** |
| RES-002 | Every claim linked to source with confidence level | `ResearchOutputSchema` + DB insert | `research_claims.confidence` | — | — | `schemas.spec.ts` | 2 | **implemented** |
| RES-003 | UNVERIFIED claims never silently promoted to facts | `ResearchClaimSchema` preserves confidence | `research_claims.confidence` | — | — | `schemas.spec.ts` UNVERIFIED test | 2 | **implemented** |
| RES-004 | Failed AI providers don't destroy research workflow | `handleResearch` marks query failed, throws `AIUnavailableError` | `research_queries.status` | — | — | `router.spec.ts` all-fail | 2 | **implemented** |

---

## TUTOR — Tutor Agent

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| TUT-001 | Tutor gives hint before answer (default action: hint) | `TutorAgent` hint-first prompt | — | `POST /run` (agent) | Tutor screen (Phase 4 UI) | `schemas.spec.ts` | 2 | **implemented** |
| TUT-002 | Explicit "show answer" via `action: reveal` | `handleTutor` reveal path | — | `POST /run` | Tutor screen | `schemas.spec.ts` | 2 | **implemented** |
| TUT-003 | Similar question generated via `action: similar` | `handleTutor` similar + `SimilarQuestionSchema` | — | `POST /run` | Tutor screen | `schemas.spec.ts` | 2 | **implemented** |
| TUT-004 | Deterministic fallback when AI unavailable | `deterministicFallback()` in handler | — | — | — | handler.ts | 2 | **implemented** |

---

## FORM — Formula Manager

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| FORM-001 | Formula vault seeded (24 formulas across PHY/CHE/MAT) | `supabase/seed/formula_seed.ts` | `formulas` | `GET /formulas/subject/:id` | Formula Vault (Phase 4 UI) | `formula.service.spec.ts` | 2 | **implemented** |
| FORM-002 | Recall is primary — student produces formula from memory | `FormulaService.submitRecall` | `formula_reviews` | `POST /formulas/:id/recall` | Formula Vault recall | `formula.service.spec.ts` | 2 | **implemented** |
| FORM-003 | Daily recall list (overdue + never-reviewed, ordered by importance) | `FormulaService.getDailyRecallList` | `formula_reviews`, `formulas` | `GET /formulas/daily` | Home (Phase 7 UI) | `formula.service.spec.ts` | 2 | **implemented** |
| FORM-004 | SRS intervals: recalled=48h, partial=12h, failed=4h | `RECALL_INTERVALS` constant | `formula_reviews.next_review_at` | — | — | `formula.service.spec.ts` | 2 | **implemented** |

---

## SENT — Sentinel

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| SENT-001 | Every agent exposes standard contract endpoints | All agents (`agent-sdk`) | `agent_heartbeats` | `GET /health /ready /version POST /test /run` | — | `sentinel.spec.ts` | 3 | stubbed |
| SENT-002 | Sentinel polls agents and records heartbeat | `SentinelAgent` | `agent_heartbeats` | `GET /sentinel/status` | Health dashboard | `sentinel.spec.ts` | 3 | planned |
| SENT-003 | Sentinel runs synthetic tests periodically | `SentinelAgent` | `agent_tests` | — | Health dashboard | `sentinel.spec.ts` | 3 | planned |
| SENT-004 | Agent health score calculated (liveness/correctness/reliability/latency) | `SentinelAgent` | `agents` | `GET /sentinel/agents` | Health dashboard | `sentinel.spec.ts` | 3 | planned |
| SENT-005 | Failed agent → retry → fallback → notify | `SentinelAgent` + `RecoveryService` | `agent_failures` | — | — | `recovery.spec.ts` | 3 | planned |
| SENT-006 | System health dashboard | — | — | `GET /sentinel/dashboard` | System Health screen | `sentinel.spec.ts` | 3 | planned |

---

## MODEL — Model Router

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| MDL-001 | All AI calls through ModelRouter | `packages/model-router` | — | internal | — | `router.spec.ts` | 2 | **implemented** |
| MDL-002 | Provider adapters: Groq, Cerebras, OpenRouter, HF | `GroqAdapter`, `CerebrasAdapter`, `OpenRouterAdapter`, `HFAdapter` | — | — | — | `router.spec.ts` | 2 | **implemented** |
| MDL-003 | Fallback to next provider on failure | `ModelRouter.generate` fallback chain | — | — | — | `router.spec.ts` fallback tests | 2 | **implemented** |
| MDL-004 | Circuit breaker per provider | `CircuitBreaker` in each adapter | — | — | — | `circuit-breaker.spec.ts` | 1 | **implemented** |
| MDL-005 | Router tracks provider status | `ModelRouter.getProviderStatuses` | in-memory | — | Health dashboard (Phase 3) | `router.spec.ts` | 2 | **implemented** |

---

## QUOTA — Quota Guardian

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| QUOT-001 | Track tokens, API calls, provider limits | `QuotaGuardian` | `quota_events` | `GET /quota/status` | Health dashboard | `quota.spec.ts` | 3 | planned |
| QUOT-002 | Three modes: NORMAL / CONSERVE / EMERGENCY | `QuotaGuardian` | — | — | — | `quota.spec.ts` | 3 | planned |
| QUOT-003 | Emergency mode reduces AI, uses deterministic fallbacks | `QuotaGuardian` | — | — | — | `quota.spec.ts` | 3 | planned |

---

## NOTIF — Notifications

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| NOTIF-001 | Notification pipeline with presence + dedup | `NotificationService` | `notifications` | — | Notification center | `notifications.spec.ts` | 3 | planned |
| NOTIF-002 | Deduplicate using composite key | `notifications.dedupe_key` UNIQUE | `notifications` | — | — | `notifications.spec.ts` | 3 | planned |
| NOTIF-003 | Student can disable proactive notifications | `ProfileService` | `student_preferences` | `PUT /profile/notifications` | Settings | `notifications.spec.ts` | 3 | planned |

---

## INV — Critical Invariants

| ID | Invariant | Enforced by | Test file | Phase | Status |
|----|-----------|-------------|-----------|-------|--------|
| INV-001 | AI cannot directly modify mastery scores | `MasteryService.assertNotAiDirectWrite` guard + route guard on POST /mastery/evidence | `mastery.service.spec.ts` INV-001 tests | 2 | **implemented** |
| INV-002 | AI cannot directly change historical study records | `StudyService` guard | `study-invariants.spec.ts` | 1 | **implemented** |
| INV-003 | Revision scheduling reproducible from stored state | `RevisionService` | `revision-invariants.spec.ts` | 3 | planned |
| INV-004 | Duplicate events don't duplicate study history | `EventBus.isProcessed` + `event_consumer_log` | `event-bus.spec.ts` | 1 | **implemented** |
| INV-005 | Failed AI provider doesn't destroy a workflow | `ModelRouter` + non-blocking event emit | `study.service.spec.ts` | 1 | **implemented** |
| INV-006 | Local agent always disableable | `LocalAgent` emergency stop | `local-agent.spec.ts` | 4 | planned |
| INV-007 | Student can override any automated plan | `PlannerAgent` | `planner.spec.ts` | 6 | planned |
| INV-008 | No agent accesses data beyond its permissions | RLS + service auth | `rls.spec.ts` | 1 | **implemented** |
| INV-009 | Presence inference never represented as certainty | `PresenceAgent` confidence < 1.0 | `presence-invariants.spec.ts` | 4 | planned |
| INV-010 | No autonomous workflow creates unbounded task loop | `RecoveryPlanner` hard cap | `planner-invariants.spec.ts` | 6 | planned |

---

## Phase Status Summary

| Phase | Requirements | Implemented | Partial/Stubbed | Planned |
|-------|-------------|-------------|-----------------|---------|
| Phase 0 | Architecture | ✅ All ADRs, repo structure, shared packages | — | — |
| **Phase 1** | AUTH 1–5, PROF 1–5, SYL 1–4, STU 1–6, EVT 1–4, INV-002/004/005/008, MDL-004 | **25 implemented** | — | — |
| **Phase 2** | MAST 1–8, RES 1–4, TUT 1–4, FORM 1–4, MDL-001/002/003/005, INV-001 | **22 implemented** | — | — |
| Phase 3 | REV 1–8, SENT 1–6, QUOTA 1–3, NOTIF 1–3, INV-003 | — | — | 20 planned |
| Phase 4 | MIST 1–6, PRES 1–4, LEC 1–6, INV-006/009 | — | — | 16 planned |
| Phase 5 | QUIZ 1–6 | — | — | 6 planned |
| Phase 6 | PLAN 1–7, INV-007/010 | — | — | 9 planned |
| Phase 7 | NBA 1–4 | — | — | 4 planned |
| Phase 3 | REV 1–8, SENT 1–6, MDL 1–5, QUOTA 1–3, NOTIF 1–3, INV-001/003 | — | — | 27 planned |
| Phase 4 | MIST 1–6, PRES 1–4, LEC 1–6, INV-006/009 | — | — | 16 planned |
| Phase 5 | QUIZ 1–6 | — | — | 6 planned |
| Phase 6 | PLAN 1–7, INV-007/010 | — | — | 9 planned |
| Phase 7 | NBA 1–4 | — | — | 4 planned |
