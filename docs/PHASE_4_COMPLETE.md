# TILLU — Phase 4 Completion Report

**Phase:** 4 — Mistake Intelligence + Presence Engine + Lecture Player  
**Status:** ✅ Complete  
**Requirements implemented:** 16  
**Tests added (Phase 4):** ~56 across 4 files  
**Cumulative tests to date:** ~248

---

## Exit Criteria — All Met

```
✅ Wrong answer creates classified mistake with correct error_type
✅ 3+ mistakes on same concept+error_type → MISTAKE_PATTERN_DETECTED emitted
✅ Repair session returns 5-step plan (micro_lesson→easy→medium→pyq→delayed_recall)
✅ Failed event emit never fails the mistake record (INV-005)
✅ Presence transitions: AVAILABLE → STUDYING on active session
✅ INV-009: PresenceService.capConfidence throws InvariantViolationError at 1.0
✅ INV-009: overridePresence caps at 0.90 (explicit, still not 1.0)
✅ PRESENCE_CHANGED emitted on state transition; NOT emitted if state unchanged
✅ Lecture progress upserted on updateProgress; LECTURE_STARTED on first update only
✅ LECTURE_COMPLETED carries recall_questions — exposure ≠ learning
✅ Completion is idempotent — LECTURE_COMPLETED not emitted twice
✅ getResumePosition returns progress_pct correctly
✅ INV-006: EmergencyStop.trigger() is idempotent, runs all callbacks, continues on error
✅ EmergencyStop writes disk stop-marker
✅ DomainGuard blocks non-approved domains, allows subdomains of approved, blocks substring attacks
✅ All ~56 tests pass with mocked clients and filesystem
```

---

## What Was Built

### MistakeService

`apps/api/src/services/mistake.service.ts`

**Pattern detection algorithm:**
- `PATTERN_THRESHOLD = 3` mistakes on same `(concept_id, error_type)` within 30 days
- Upserts `mistake_patterns` row with frequency and severity (`low/medium/high`)
- Severity: `frequency ≥ 6` → high, `≥ 4` → medium, `< 4` → low

**10 supported error types:**
`conceptual` · `formula` · `calculation` · `sign` · `unit` · `carelessness` · `misreading` · `memory` · `time_pressure` · `presentation`

**5-step repair plan (`startRepairSession`):**
1. `micro_lesson` (5 min) — review core principle
2. `easy_question` (5 min) — straightforward question
3. `medium_question` (8 min) — standard difficulty
4. `pyq` (10 min) — past year board question
5. `delayed_recall` (5 min, scheduled 2 days later) — from memory

**API routes:**

| Route | Description |
|-------|-------------|
| `POST /mistakes` | Record mistake + trigger pattern detection |
| `GET /mistakes` | List mistakes (filterable by concept, error_type, status) |
| `GET /mistakes/bank` | Summary grouped by concept with top error type |
| `GET /mistakes/patterns` | Active patterns (≥3 threshold) |
| `POST /mistakes/repair/:patternId` | Return 5-step repair plan |
| `PATCH /mistakes/:id/resolve` | Update resolution status |

---

### PresenceService

`apps/api/src/services/presence.service.ts`

**State machine:** 6 states, any-to-any transitions based on signal aggregation.

**5 signal types with weights:**

| Signal | Weight | Source |
|--------|--------|--------|
| `web_session_active` | 0.35 | Web app middleware |
| `study_session_open` | 0.30 | StudyService |
| `local_agent_ping` | 0.25 | LocalAgent heartbeat |
| `recent_api_call` | 0.15 | API middleware |
| `lecture_active` | 0.25 | LectureService |

**INV-009 enforcement (two layers):**
1. `capConfidence(raw)` — throws `InvariantViolationError` if `raw ≥ 1.0`; caps at 0.95
2. `assertConfidenceInvariant(confidence)` — called before every DB write

**Decay:** `decayStalePresence()` — AVAILABLE → AWAY after 15 min, AWAY/any → OFFLINE after 60 min.

**API routes:**

| Route | Description |
|-------|-------------|
| `GET /presence` | Current state + confidence |
| `PUT /presence/signal` | Process incoming signal, recompute state |
| `POST /presence/override` | Manual override (capped at 0.90) |
| `POST /presence/decay` | Trigger decay scan |

---

### LectureService

`apps/api/src/services/lecture.service.ts`

**Critical design principle preserved:**
> Watching a lecture creates EXPOSURE evidence only, not mastery.
> LECTURE_COMPLETED includes `recall_questions` — the student must answer those to generate learning evidence.

**Key flows:**
- `updateProgress()` — upserts `lecture_progress`, emits `LECTURE_STARTED` on first call, `LECTURE_COMPLETED` on completion
- `handleLectureCompleted()` — loads top-5 concepts by importance from chapter, builds 3–5 recall questions
- `getResumePosition()` — returns `position_sec`, `duration_sec`, `progress_pct`
- `getLastWatched()` — finds in-progress lecture ordered by `last_watched_at`
- `getChapterLectureProgress()` — `{total, completed, in_progress, pct}`

**API routes:**

| Route | Description |
|-------|-------------|
| `GET /lectures/chapters/:id` | Approved playlists for chapter |
| `GET /lectures/chapters/:id/last-watched` | Resume position for chapter |
| `GET /lectures/chapters/:id/progress` | Completion stats |
| `GET /lectures/playlists/:id` | Playlist with per-lecture progress |
| `GET /lectures/:id/resume` | Resume position for a lecture |
| `PUT /lectures/:id/progress` | Update playback position |
| `POST /lectures/:id/complete` | Mark complete + emit recall questions |

---

### LocalAgent

`apps/local-agent/src/`

**Four key components:**

**`DomainGuard`**
- Maintains `Set<string>` of approved domains
- `isAllowed(url)` — checks hostname with subdomain support
- `assertAllowed(url)` — throws with message on violation
- Case-insensitive matching
- Blocks substring attacks (`notyoutube.com` ≠ `youtube.com`)

**`EmergencyStop` — INV-006**
- Static flag (`stopped = true`) set atomically before any cleanup
- `onStop(cb)` — registers cleanup callbacks (close browser, cancel sync)
- `trigger(reason)` — idempotent; runs all callbacks with `.catch()` wrappers; writes disk stop-marker
- `wasManuallyStoppedBefore()` — prevents auto-resume on restart
- `clearStopMarker()` — re-enables agent after explicit `POST /enable`
- `SIGTERM` / `SIGINT` both route through `trigger("signal")`

**`BrowserController`**
- `launch()` — Playwright `chromium.launch({ headless: false })`
- `page.route("**/*")` — blocks navigation to non-approved domains at network level before any request leaves
- `navigateTo(url, lectureId)` — calls `DomainGuard.assertAllowed()`, triggers EmergencyStop on violation
- `pollPlaybackPosition()` — evaluates `video.currentTime`, `video.duration`, `video.ended`
- EmergencyStop callback closes browser

**`LectureProgressSync`**
- Polls `BrowserController.pollPlaybackPosition()` every `syncIntervalMs`
- `pushToCloud()` — `PUT /lectures/:id/progress` with Bearer token
- Offline queue: if cloud unreachable, saves to disk JSON; flushes on reconnect
- Queue deduplication: newer position replaces older for same lecture

**Express endpoints (all mutation require `X-Agent-Secret`):**

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Liveness (no auth) |
| `GET /status` | Full state (enabled, browser, playback, allowed domains) |
| `POST /launch` | Launch Chromium |
| `POST /navigate` | Navigate to lecture URL (domain-guarded) |
| `POST /stop` | **Emergency stop — INV-006** |
| `POST /enable` | Clear stop marker + re-enable |
| `GET /playback` | Current playback position |
| `POST /sync` | Manual sync trigger |
| `PUT /token` | Set Bearer token for cloud sync |

---

### Web UI Updates

**Study tab** — Quick-nav tiles for 🎬 Lectures and 🔴 Mistakes.

**`/mistakes`** — Mistake Bank page:
- Recurring patterns with severity (high/medium/low), frequency, and "Start repair" button
- Per-concept mistake counts grouped with top error type
- Error type breakdown chips per concept
- `MistakeClassifier` client component (10 error options, optional cause note, POST /mistakes)

**`/lectures`** hierarchy:
- `/lectures` — subject grid
- `/lectures/:subjectId` — chapters grouped by unit
- `/lectures/:subjectId/:chapterId` — playlists + lectures with progress bar, Watch/Resume/Watch-again, local agent launch

---

## Tests Added in Phase 4

| File | Tests | Coverage |
|------|-------|---------|
| `mistake.service.spec.ts` | 14 | Schema (10 types), createMistake, MISTAKE_CREATED, INV-005 non-blocking, pattern detection (threshold=3, MISTAKE_PATTERN_DETECTED), repair plan 5-steps, NOT_FOUND |
| `presence.service.spec.ts` | 14 | INV-009 capConfidence (throws at 1.0, caps at 0.95), assertConfidenceInvariant, processSignal (STUDYING, AWAY), PRESENCE_CHANGED emitted/not-emitted, ValidationError, overridePresence cap=0.90 |
| `lecture.service.spec.ts` | 12 | Schema, updateProgress (LECTURE_STARTED first-update only, LECTURE_COMPLETED with recall_questions, idempotent), NOT_FOUND, getResumePosition progress_pct, exposure≠learning invariant |
| `emergency-stop.spec.ts` | 16 | INV-006 trigger idempotent, callbacks run, continues on error, disk marker, clearStopMarker, 4 reason types; DomainGuard (allowlist, subdomain, block, substring attack, malformed URL, assertAllowed, case-insensitive) |

**Phase 4 total: ~56 tests**

---

## Invariants Verified in Phase 4

| INV | Description | Enforcement | Test |
|-----|-------------|-------------|------|
| INV-005 | Failed event emit never destroys primary operation | MistakeService wraps emit in `.catch()` | `mistake.service.spec.ts` |
| INV-006 | Local agent always stoppable | `EmergencyStop.trigger()` idempotent, callbacks have `.catch()`, stop before cleanup | `emergency-stop.spec.ts` |
| INV-009 | Presence confidence never equals 1.0 | `capConfidence` throws at ≥1.0; `assertConfidenceInvariant` before every DB write | `presence.service.spec.ts` (6 dedicated tests) |

---

## New Database Tables Used (created in migrations 0002/0004)

| Table | Phase used | Status |
|-------|-----------|--------|
| `mistakes` | 4 | ✅ Populated by MistakeService |
| `mistake_patterns` | 4 | ✅ Populated by pattern detection |
| `presence_state` | 4 | ✅ Upserted by PresenceService |
| `presence_events` | 4 | ✅ Appended on state change |
| `lecture_progress` | 4 | ✅ Upserted by LectureService |
| `playlists` | 4 | Ready (seeded manually) |
| `lectures` | 4 | Ready (seeded manually) |

---

## Technical Debt Introduced in Phase 4

| ID | Description | Fix in |
|----|-------------|--------|
| TD-016 | LocalAgent `NEXT_PUBLIC_LOCAL_AGENT_SECRET` exposed in browser bundle — only safe because it's localhost-only | Phase 5: move local agent calls through the API as a proxy |
| TD-017 | MistakeService doesn't automatically trigger MasteryService evidence after a mistake (INV impact on mastery) | Phase 5: wire MISTAKE_CREATED event → mastery evidence update |
| TD-018 | PresenceService `computeState` always queries DB — should cache active session state in memory | Phase 6: add short TTL cache |
| TD-019 | LectureService recall questions are generic ("In your own words, explain X") — not specific board-level questions | Phase 5: QuizAgent generates proper post-lecture questions |
| TD-020 | Lecture URL in `buildYouTubeUrl()` uses lecture ID as video ID (placeholder) — real URLs come from playlist seed data | Phase 4 follow-up: update seed script to include real YouTube URLs |

---

## New API Routes Summary

| Route | Auth | Phase |
|-------|------|-------|
| `POST /mistakes` | ✅ JWT | 4 |
| `GET /mistakes` | ✅ JWT | 4 |
| `GET /mistakes/bank` | ✅ JWT | 4 |
| `GET /mistakes/patterns` | ✅ JWT | 4 |
| `POST /mistakes/repair/:patternId` | ✅ JWT | 4 |
| `PATCH /mistakes/:id/resolve` | ✅ JWT | 4 |
| `GET /presence` | ✅ JWT | 4 |
| `PUT /presence/signal` | ✅ JWT | 4 |
| `POST /presence/override` | ✅ JWT | 4 |
| `POST /presence/decay` | ✅ JWT | 4 |
| `GET /lectures/chapters/:id` | ✅ JWT | 4 |
| `GET /lectures/chapters/:id/last-watched` | ✅ JWT | 4 |
| `GET /lectures/chapters/:id/progress` | ✅ JWT | 4 |
| `GET /lectures/playlists/:id` | ✅ JWT | 4 |
| `GET /lectures/:id/resume` | ✅ JWT | 4 |
| `PUT /lectures/:id/progress` | ✅ JWT | 4 |
| `POST /lectures/:id/complete` | ✅ JWT | 4 |

**Local agent endpoints** (all require `X-Agent-Secret`, localhost only):
`GET /health` · `GET /status` · `GET /playback` · `POST /launch` · `POST /navigate` · `POST /stop` · `POST /enable` · `POST /sync` · `PUT /token`

---

## Phase 4 → Phase 5 Handoff Checklist

- [x] `mistakes` and `mistake_patterns` tables populated by MistakeService
- [x] INV-006 EmergencyStop implemented, tested, and confirmed idempotent
- [x] INV-009 PresenceService confidence guard at two levels: `capConfidence` + `assertConfidenceInvariant`
- [x] LectureService emits recall_questions on LECTURE_COMPLETED — correct exposure≠learning separation
- [x] LocalAgent scaffold complete with DomainGuard + BrowserController + ProgressSync
- [x] All Phase 4 requirements marked `implemented` in REQUIREMENTS_MATRIX.md
- [x] app.ts registers `/mistakes`, `/presence`, `/lectures` routes
- [x] Web: Mistake Bank, Lectures hierarchy, MistakeClassifier component, Study tab quick-nav
- [x] ~56 new tests, all passing with mocked clients/filesystem

---

## Cumulative Build State

| Phase | Requirements | Tests |
|-------|-------------|-------|
| 0 | Architecture + docs | — |
| 1 | 25 | ~89 |
| 2 | 22 | ~53 |
| 3 | 21 | ~53 |
| **4** | **16** | **~56** |
| **Total** | **84** | **~251** |

---

## Phase 5 Preview

**Goal:** Automatic daily quizzes with full quiz→mistake→mastery→revision chain.

**Phase 5 builds:**
```
QuizAgent              AI-generated questions (Zod-validated output)
                       7 quiz modes: daily/quick/revision/weakness/mixed/pyq/exam_sim
                       Invalid output: retry → fallback model → deterministic fallback

QuizService            Quiz creation, attempt recording, result analysis
                       POST /quiz/generate, GET /quiz/daily
                       QUIZ_COMPLETED → mastery + mistake + revision chain

n8n Daily Quiz         06:35 cron → fetch student state → QuizAgent → store → notify
                       Idempotent (double-trigger safe)

Post-lecture Recall    LECTURE_COMPLETED → QuizAgent generates targeted questions
                       Replaces generic "explain X" placeholder from Phase 4

Mastery side-effects   MISTAKE_CREATED → MasteryService.addEvidence (evidence_type: practice, score: 0)
                       (TD-017 resolved in Phase 5)
```

**Phase 5 exit criteria:**
```
✓ Daily quiz auto-generated each morning
✓ Malformed AI output caught, retried, then uses deterministic fallback
✓ Quiz schema validation rejects bad AI output before storage
✓ QUIZ_COMPLETED triggers mastery change + mistake record + revision reschedule (E2E)
✓ MISTAKE_CREATED now also updates mastery evidence (TD-017 fixed)
✓ n8n morning workflow runs idempotently
✓ All tests pass
```
