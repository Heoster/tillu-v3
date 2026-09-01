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
| REV-001 | Revision automatically scheduled after concept exposure | `RevisionService.scheduleRevision` | `revision_items` | `POST /revision/schedule` | Revision tab | `revision.service.spec.ts` | 3 | **implemented** |
| REV-002 | Adaptive spaced-repetition algorithm (SM-2 inspired, ease factor 1.3–2.5) | `RevisionService.completeRevision` SRS math | `revision_items.stability` | — | — | `revision.service.spec.ts` | 3 | **implemented** |
| REV-003 | Revision algorithm versioned (`REVISION_ALGORITHM_VERSION = "v1"`) | `REVISION_ALGORITHM_VERSION` constant | `revision_items.revision_algorithm_version` | — | — | `revision.service.spec.ts` | 3 | **implemented** |
| REV-004 | REVISION_DUE event emitted when review date arrives (scan + emit) | `RevisionService.scanAndEmitDue` | `events` | `POST /revision/scan` | Revision tab | `revision.service.spec.ts` | 3 | **implemented** |
| REV-005 | Recall success/failure updates next review date and stability | `RevisionService.completeRevision` | `revision_events` | `POST /revision/:id/complete` | Revision session | `revision.service.spec.ts` | 3 | **implemented** |
| REV-006 | Forgetting risk and priority calculated per concept | `RevisionService.getForgettingRadar` | `revision_items.priority` | `GET /revision/radar` | Forgetting Radar | `revision.service.spec.ts` | 3 | **implemented** |
| REV-007 | Studied ≠ Actually Remembered — INV-003 (reproducible scheduling) | `RevisionService.assertAlgorithmVersion` | `revision_events` | — | — | `revision.service.spec.ts` INV-003 | 3 | **implemented** |
| REV-008 | Revision dashboard: due_now, coming_up, memory_health (strong/stable/weak) | `RevisionService.getDashboard` | `revision_items` | `GET /revision/dashboard` | Revision tab | `revision.service.spec.ts` | 3 | **implemented** |

---

## MIST — Mistake Bank

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| MIS-001 | Every wrong answer creates a structured mistake record | `MistakeService.createMistake` | `mistakes` | `POST /mistakes` | `MistakeClassifier` component | `mistake.service.spec.ts` | 4 | **implemented** |
| MIS-002 | Mistake classified by 10 error types | `ErrorTypeSchema` (10 categories) | `mistakes.error_type` | `POST /mistakes` | `MistakeClassifier` (10 options) | `mistake.service.spec.ts` | 4 | **implemented** |
| MIS-003 | 3+ same concept+error_type in 30 days → pattern detected | `MistakeService.detectPattern` (PATTERN_THRESHOLD=3) | `mistake_patterns` | `GET /mistakes/patterns` | Mistake Bank patterns section | `mistake.service.spec.ts` | 4 | **implemented** |
| MIS-004 | Pattern triggers 5-step repair session | `MistakeService.startRepairSession` (micro_lesson→easy→medium→pyq→delayed_recall) | `mistake_patterns` | `POST /mistakes/repair/:patternId` | Mistake Bank repair button | `mistake.service.spec.ts` | 4 | **implemented** |
| MIS-005 | MISTAKE_CREATED and MISTAKE_PATTERN_DETECTED events emitted | `EventBus` in MistakeService (non-blocking) | `events` | — | — | `mistake.service.spec.ts` | 4 | **implemented** |
| MIS-006 | Failed event emit never fails the mistake record (INV-005) | `.catch()` wrapper on emit | `mistakes` | — | — | `mistake.service.spec.ts` INV-005 | 4 | **implemented** |

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
| PRES-001 | 6 presence states (UNKNOWN/AVAILABLE/STUDYING/AWAY/SLEEPING/OFFLINE) | `PresenceService` state machine | `presence_state` | `GET /presence` | Home status dot | `presence.service.spec.ts` | 4 | **implemented** |
| PRES-002 | Presence confidence never equals 1.0 — INV-009 | `PresenceService.capConfidence` (MAX=0.95) + `assertConfidenceInvariant` | `presence_state.confidence` | — | — | `presence.service.spec.ts` INV-009 tests | 4 | **implemented** |
| PRES-003 | Presence affects notification decisions | `NotificationService` `PRESENCE_POLICY` map | `presence_state` | — | — | `notification.service.spec.ts` | 3 | **implemented** |
| PRES-004 | No webcam/mic/keylogger — signals are: web session, API call, local heartbeat, study session, lecture | `PresenceService` signal types only | — | — | — | privacy: signal types enforce this | 4 | **implemented** |

---

## LEC — Lecture Player

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| LEC-001 | Approved playlists stored per chapter | `LectureService.getPlaylists` (approved=true filter) | `playlists`, `lectures` | `GET /lectures/chapters/:chapterId` | `/lectures/:subjectId/:chapterId` | `lecture.service.spec.ts` | 4 | **implemented** |
| LEC-002 | Local agent opens Chromium on approved domains only | `BrowserController` + `DomainGuard` (blocks at network level) | `lecture_progress` | `POST /navigate` (local agent) | Chapter lectures page Watch button | `emergency-stop.spec.ts` DomainGuard tests | 4 | **implemented** |
| LEC-003 | Lecture progress continuously tracked (position, duration) | `LectureService.updateProgress` | `lecture_progress` | `PUT /lectures/:id/progress` | Progress bar | `lecture.service.spec.ts` | 4 | **implemented** |
| LEC-004 | Resume from last position | `LectureService.getResumePosition` | `lecture_progress` | `GET /lectures/:id/resume` | Resume button with % shown | `lecture.service.spec.ts` | 4 | **implemented** |
| LEC-005 | LECTURE_COMPLETED emits recall questions (3–5 per chapter concepts) | `LectureService.handleLectureCompleted` | `events` | `POST /lectures/:id/complete` | Post-lecture recall (Phase 5 UI) | `lecture.service.spec.ts` exposure≠learning | 4 | **implemented** |
| LEC-006 | Local agent emergency stop — INV-006 | `EmergencyStop.trigger()` always succeeds, callbacks run, disk marker written | — | `POST /stop` (local agent) | — | `emergency-stop.spec.ts` INV-006 tests | 4 | **implemented** |

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
| SENT-001 | Every agent exposes standard contract (`/health /ready /version POST /test /run`) | `@tillu/agent-sdk` `AgentBase` + `createAgentServer` | `agent_heartbeats` | All agents | — | `sentinel.service.spec.ts` | 3 | **implemented** |
| SENT-002 | Sentinel polls agents, records heartbeats, updates `agent_heartbeats` | `SentinelService.pollAgent` | `agent_heartbeats` | `POST /sentinel/poll` | Health dashboard | `sentinel.service.spec.ts` | 3 | **implemented** |
| SENT-003 | Sentinel runs synthetic tests via `POST /test` on each agent | `SentinelService.runSyntheticTest` | `agent_tests` | `POST /sentinel/test/:agentName` | Health dashboard | `sentinel.service.spec.ts` | 3 | **implemented** |
| SENT-004 | Health score: liveness 30% + correctness 40% + reliability 20% + latency 10% | `SentinelService.pollAgent` score formula | `agents.health_score` | `GET /sentinel/agents` | Health dashboard | `sentinel.service.spec.ts` | 3 | **implemented** |
| SENT-005 | Failed agent status transition emits AGENT_HEALTH_CHANGED, records `agent_failures` | `SentinelService.pollAgent` event emit | `agent_failures` | — | — | `sentinel.service.spec.ts` | 3 | **implemented** |
| SENT-006 | System health dashboard (agents, overall score, incidents, last full test) | `SentinelService.getDashboard` | `agents` | `GET /sentinel/dashboard` | System Health screen | `sentinel.service.spec.ts` | 3 | **implemented** |

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
| QUOT-001 | Track tokens and API calls per provider; persist to `quota_events` | `QuotaGuardian.recordUsage` + `flushToDb` | `quota_events`, `quota_daily_summary` | `GET /quota/status` | Health dashboard | `quota-guardian.spec.ts` | 3 | **implemented** |
| QUOT-002 | Three modes: NORMAL / CONSERVE / EMERGENCY with configurable thresholds | `QuotaGuardian.getModeForProvider` + `getOverallMode` | — | — | — | `quota-guardian.spec.ts` | 3 | **implemented** |
| QUOT-003 | CONSERVE blocks background tasks; EMERGENCY blocks all AI calls | `QuotaGuardian.canUseProvider` integrated into `ModelRouter.generate` | — | — | — | `quota-guardian.spec.ts` | 3 | **implemented** |

---

## NOTIF — Notifications

| ID | Requirement | Component | Database | API | UI | Test | Phase | Status |
|----|-------------|-----------|----------|-----|----|------|-------|--------|
| NOTIF-001 | Notification pipeline: event → importance → presence → quiet hours → dedupe → send/queue/suppress | `NotificationService.send` 5-step pipeline | `notifications` | `NotificationService.sendForEvent` helper | — | `notification.service.spec.ts` | 3 | **implemented** |
| NOTIF-002 | Deduplication via composite key (`event_type:entity_id:YYYY-MM-DD`), UNIQUE in DB | `notifications.dedupe_key` UNIQUE constraint + pre-check | `notifications` | — | — | `notification.service.spec.ts` NOTIF-002 tests | 3 | **implemented** |
| NOTIF-003 | Presence-based suppression: STUDYING/SLEEPING block non-critical; AVAILABLE allows all | `PRESENCE_POLICY` map in NotificationService | `presence_state` | — | — | `notification.service.spec.ts` presence tests | 3 | **implemented** |

---

## INV — Critical Invariants

| ID | Invariant | Enforced by | Test file | Phase | Status |
|----|-----------|-------------|-----------|-------|--------|
| INV-001 | AI cannot directly modify mastery scores | `MasteryService.assertNotAiDirectWrite` guard + route guard on POST /mastery/evidence | `mastery.service.spec.ts` INV-001 tests | 2 | **implemented** |
| INV-002 | AI cannot directly change historical study records | `StudyService` guard | `study-invariants.spec.ts` | 1 | **implemented** |
| INV-003 | Revision scheduling reproducible from stored state — `assertAlgorithmVersion` throws if stored ≠ current | `RevisionService.assertAlgorithmVersion` static guard | `revision.service.spec.ts` INV-003 + reproducibility tests | 3 | **implemented** |
| INV-004 | Duplicate events don't duplicate study history | `EventBus.isProcessed` + `event_consumer_log` | `event-bus.spec.ts` | 1 | **implemented** |
| INV-005 | Failed AI provider doesn't destroy a workflow | `ModelRouter` + non-blocking event emit | `study.service.spec.ts` | 1 | **implemented** |
| INV-006 | Local agent always disableable — EmergencyStop.trigger() succeeds even if cleanup throws | `EmergencyStop.trigger()` idempotent, `.catch()` in callbacks, SIGTERM/SIGINT handlers | `emergency-stop.spec.ts` INV-006 tests | 4 | **implemented** |
| INV-007 | Student can override any automated plan | `PlannerAgent` | `planner.spec.ts` | 6 | planned |
| INV-008 | No agent accesses data beyond its permissions | RLS + service auth | `rls.spec.ts` | 1 | **implemented** |
| INV-009 | Presence inference never represented as certainty — confidence < 1.0 always | `PresenceService.capConfidence` (throws at ≥1.0) + `assertConfidenceInvariant` | `presence.service.spec.ts` INV-009 tests | 4 | **implemented** |
| INV-010 | No autonomous workflow creates unbounded task loop | `RecoveryPlanner` hard cap | `planner-invariants.spec.ts` | 6 | planned |

---

## Phase Status Summary

| Phase | Requirements | Implemented | Partial/Stubbed | Planned |
|-------|-------------|-------------|-----------------|---------|
| Phase 0 | Architecture | ✅ All ADRs, repo structure, shared packages | — | — |
| **Phase 1** | AUTH 1–5, PROF 1–5, SYL 1–4, STU 1–6, EVT 1–4, INV-002/004/005/008, MDL-004 | **25 implemented** | — | — |
| **Phase 2** | MAST 1–8, RES 1–4, TUT 1–4, FORM 1–4, MDL-001/002/003/005, INV-001 | **22 implemented** | — | — |
| **Phase 3** | REV 1–8, SENT 1–6, QUOT 1–3, NOTIF 1–3, INV-003 | **21 implemented** | — | — |
| **Phase 4** | MIST 1–6, PRES 1–4, LEC 1–6, INV-006/009 | **16 implemented** | — | — |
| Phase 5 | QUIZ 1–6 | — | — | 6 planned |
| Phase 6 | PLAN 1–7, INV-007/010 | — | — | 9 planned |
| Phase 7 | NBA 1–4 | — | — | 4 planned |