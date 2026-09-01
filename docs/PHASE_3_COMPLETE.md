# TILLU — Phase 3 Completion Report

**Phase:** 3 — Revision Manager + Sentinel + Quota Guardian + Notifications  
**Status:** ✅ Complete  
**Requirements implemented:** 21  
**Tests added (Phase 3):** ~53 across 4 files  
**Cumulative tests to date:** ~192

---

## Exit Criteria — All Met

```
✅ Revision automatically scheduled after concept exposure (scheduleRevision)
✅ Recall outcome updates next review date and ease factor (SM-2 SRS)
✅ Interval caps: 4h minimum on failure, 720h maximum (30 days)
✅ INV-003: assertAlgorithmVersion throws InvariantViolationError on version mismatch
✅ INV-003: Same inputs reproduce identical next_review_at (deterministic — tested with vi.setSystemTime)
✅ Forgetting radar populated with real priority scores
✅ Revision dashboard returns due_now + coming_up + memory_health
✅ Sentinel detects agent liveness failure (health score drops to <50)
✅ AGENT_HEALTH_CHANGED emitted when status transitions
✅ Sentinel does NOT emit event if status unchanged
✅ runSyntheticTest returns pass/fail/timeout and records to agent_tests
✅ QuotaGuardian transitions NORMAL → CONSERVE at 75% → EMERGENCY at 90%
✅ canUseProvider blocks background tasks in CONSERVE, all tasks in EMERGENCY
✅ QuotaGuardian.recordUsage integrated into ModelRouter.generate
✅ NotificationService deduplicates: same dedupe_key returns 'duplicate' without DB insert
✅ STUDYING presence → normal notification queued (not sent)
✅ SLEEPING presence → normal notification queued; critical bypasses
✅ NOTIFICATION_SENT event emitted only on successful send (not on duplicate/queue)
✅ All unit tests pass with mocked clients
```

---

## What Was Built

### Migration 0004

`supabase/migrations/0004_presence_quota.sql`

New tables:
- `presence_state` — current student presence (UNKNOWN/AVAILABLE/STUDYING/AWAY/SLEEPING/OFFLINE + confidence)
- `presence_events` — append-only presence transition log
- `quota_events` — AI provider usage records (tokens, requests, errors)
- `quota_daily_summary` — per-provider daily totals
- `playlists`, `lectures`, `lecture_progress` — Phase 4 prep tables (created now for schema coherence)

FK added: `mistakes.question_id → questions.id` (deferred from migration 0002).

All new tables have RLS.

---

### RevisionService

`apps/api/src/services/revision.service.ts`

**Algorithm:** SM-2 inspired spaced repetition

| Ease delta by recall quality | 0 | 1 | 2 | 3 | 4 | 5 |
|------------------------------|-----|-----|-----|-----|-----|-----|
| Factor change | −0.30 | −0.20 | −0.10 | 0.00 | +0.10 | +0.15 |

- Ease factor (stability) bounds: 1.3 – 2.5
- Failure or quality < 3 → interval resets to 4 hours
- Success → interval grows by `current_interval × new_stability`
- Interval cap: 720 hours (30 days)
- Forgetting risk = f(stability, interval, failure_count, recent_failure)
- Priority = `importance_normalised × forgetting_risk × (failure_spike_multiplier)`

**INV-003 guard:** `assertAlgorithmVersion(storedVersion)` — throws `InvariantViolationError` if stored version ≠ `REVISION_ALGORITHM_VERSION`. This prevents silently applying v2 math to v1 data rows.

**Reproducibility:** All scheduling math uses stored state only (no random seeds, no AI, no external time input). `vi.setSystemTime` test confirms same inputs → identical `next_review_at`.

**API routes:**

| Route | Description |
|-------|-------------|
| `GET /revision/dashboard` | due_now + coming_up + radar + memory_health |
| `GET /revision/due` | Overdue items, priority DESC |
| `GET /revision/upcoming` | Items due within N hours |
| `GET /revision/radar` | Top concepts by forgetting risk |
| `POST /revision/schedule` | Schedule a new revision item |
| `POST /revision/:id/complete` | Record outcome, advance SRS interval |
| `POST /revision/scan` | Emit REVISION_DUE for all overdue items |

**Events emitted:**
- `REVISION_SCHEDULED` — new item created
- `REVISION_COMPLETED` — successful recall
- `REVISION_FAILED` — failed recall
- `REVISION_DUE` — scan finds overdue items

---

### SentinelService

`apps/api/src/services/sentinel.service.ts`

**Health score formula (TRD §42):**
```
score = (liveness × 0.30) + (correctness × 0.40) + (reliability × 0.20) + (latency × 0.10)
```

| Score | Status |
|-------|--------|
| 90–100 | healthy |
| 75–89 | degraded |
| 50–74 | failing |
| 0–49 | down |

**Per-poll actions:**
1. `GET /health` on agent endpoint (liveness + latency)
2. Load last synthetic test result (correctness)
3. Load last 10 heartbeats (reliability rate)
4. Compute health score
5. Write `agent_heartbeats` row
6. Update `agents` table
7. Emit `AGENT_HEALTH_CHANGED` if status changed
8. Write `agent_failures` row if transitioning to failing/down

**API routes:**

| Route | Description |
|-------|-------------|
| `GET /sentinel/dashboard` | Full system health (agents, score, incidents) |
| `GET /sentinel/agents` | Agent list with current status |
| `POST /sentinel/poll` | Immediate health poll of all agents |
| `POST /sentinel/test/:agentName` | Run synthetic test on named agent |
| `POST /sentinel/register` | Register/update agent in registry |

---

### NotificationService

`apps/api/src/services/notification.service.ts`

**5-step pipeline:**
```
1. Deduplication  — same dedupe_key? → return 'duplicate' (no DB insert)
2. Presence check — PRESENCE_POLICY[state].includes(priority)? → queue if not
3. Quiet hours    — in sleep window? → queue (unless BYPASS_QUIET_HOURS priority)
4. Send           — INSERT status='sent', sent_at=now
5. Emit           — NOTIFICATION_SENT event
```

**Presence policy:**

| State | Allowed priorities |
|-------|-------------------|
| AVAILABLE | critical, high, normal, low |
| STUDYING | critical only |
| SLEEPING | critical only |
| AWAY | critical, high |
| OFFLINE | critical, high |
| UNKNOWN | critical, high |

**`sendForEvent` helper:** auto-builds `dedupe_key` as `eventType:entityId:YYYY-MM-DD` — prevents per-event spam within a calendar day.

**`flushQueued`:** Delivers queued notifications when student becomes AVAILABLE. Called on presence transition.

---

### QuotaGuardian

`packages/model-router/src/quota-guardian.ts`

**In-memory usage tracking per provider with daily reset.**

| Threshold | Mode | Effect |
|-----------|------|--------|
| < 75% | NORMAL | All AI calls allowed |
| ≥ 75% | CONSERVE | Background tasks blocked (research, weekly_report, etc.) |
| ≥ 90% | EMERGENCY | All AI calls blocked → `AIUnavailableError` → deterministic fallback |

**Integration with ModelRouter:**
- `canUseProvider(provider, task)` called before every `generate()` — returns false in EMERGENCY
- `recordUsage(provider, tokens, status)` called after every successful generate
- Daily counter resets at UTC midnight
- `flushToDb()` persists pending records to `quota_events` (called every 60s by n8n)

**`getStatus()` → `QuotaStatus`:** Used by `/quota/status` endpoint and system health dashboard.

---

### Web UI Updates (Phase 3)

The three UI screens updated in this phase:

1. **Revision tab** — live data from `GET /revision/dashboard`
   - Due now section with concept + priority
   - Coming up section (next 24h)
   - Memory health bar (strong/stable/weak percentages)
   - START REVISION button

2. **Home screen** — live forgetting radar from `GET /revision/radar`
   - `ForgettingRadar` client component
   - Shows top 5 concepts by forgetting risk with color coding
   - Replaces Phase 1 static placeholder

3. **System Health screen** — live data from `GET /sentinel/dashboard`
   - `/health` route in `(app)` group
   - Overall status badge + score
   - Per-agent status (healthy/degraded/failing/down)
   - Quota mode indicator
   - Last full test timestamp

---

## Tests Added in Phase 3

| File | Tests | Key coverage |
|------|-------|-------------|
| `revision.service.spec.ts` | 15 | Schema, INV-003 guard (4 tests), scheduleRevision, SRS interval math (failure=4h, success grows, cap=720h), REVISION_COMPLETED/FAILED events, reproducibility |
| `sentinel.service.spec.ts` | 10 | Liveness true/false, health score, AGENT_HEALTH_CHANGED emitted on transition, not emitted if unchanged, runSyntheticTest pass/fail/timeout, NOT_FOUND |
| `notification.service.spec.ts` | 12 | Schema, dedup (no second insert), STUDYING queues normal, SLEEPING queues normal, CRITICAL bypasses SLEEPING, sendForEvent dedupe_key format, NOTIFICATION_SENT emitted/not-emitted |
| `quota-guardian.spec.ts` | 16 | Mode transitions (NORMAL/CONSERVE/EMERGENCY), canUseProvider, recordUsage accumulates, flushToDb inserts + re-queues on error, getStatus usagePct, getOverallMode worst-case |

**Phase 3 total: ~53 tests**

---

## Invariants Verified in Phase 3

| INV | Description | Test |
|-----|-------------|------|
| INV-003 | Revision scheduling reproducible from stored state | `assertAlgorithmVersion` throws on mismatch; `vi.setSystemTime` reproducibility test shows same `next_review_at` for identical inputs |
| INV-005 | Failed EventBus emit never destroys primary operation | RevisionService and SentinelService both wrap event emit in `.catch()` |

---

## New Database Tables (Migration 0004)

| Table | Purpose |
|-------|---------|
| `presence_state` | Current student presence (Phase 4 PresenceAgent will write here) |
| `presence_events` | Append-only presence transition log |
| `quota_events` | AI provider usage records |
| `quota_daily_summary` | Per-provider daily totals |
| `playlists` | Approved lecture playlists (Phase 4) |
| `lectures` | Individual lecture entries (Phase 4) |
| `lecture_progress` | Student lecture progress + resume position (Phase 4) |

---

## Technical Debt Introduced in Phase 3

| ID | Description | Fix in |
|----|-------------|--------|
| TD-011 | SentinelService `pollAllAgents` polls agents sequentially — should be parallel with `Promise.allSettled` | Phase 4 (when agents are actually deployed) |
| TD-012 | QuotaGuardian daily reset is time-based in-memory — if API restarts at 23:59, counter resets early | Phase 5 — load today's total from `quota_daily_summary` on startup |
| TD-013 | NotificationService sends notifications as DB records only — no real push notification channel (browser push, email) | Phase 5 — add push notification channel |
| TD-014 | `flushQueued` in NotificationService uses `dedupe_key + ":flushed"` suffix — slightly hacky | Phase 5 — clean up with proper queued→sent state machine |
| TD-015 | Sentinel `pollAgent` mocks `withTimeout` in tests — the mock is shared with utilities module; may need isolation | Phase 4 — refactor to dependency injection |

---

## New API Routes Added in Phase 3

| Route | Auth | Description |
|-------|------|-------------|
| `GET /revision/dashboard` | ✅ JWT | Full revision dashboard |
| `GET /revision/due` | ✅ JWT | Overdue items |
| `GET /revision/upcoming` | ✅ JWT | Items due in N hours |
| `GET /revision/radar` | ✅ JWT | Forgetting radar |
| `POST /revision/schedule` | ✅ JWT | Schedule revision for a concept |
| `POST /revision/:id/complete` | ✅ JWT | Record outcome + advance SRS |
| `POST /revision/scan` | ✅ JWT | Emit REVISION_DUE for all overdue items |
| `GET /sentinel/dashboard` | ✅ JWT | System health dashboard |
| `GET /sentinel/agents` | ✅ JWT | Agent list |
| `POST /sentinel/poll` | ✅ JWT | Trigger immediate poll |
| `POST /sentinel/test/:agentName` | ✅ JWT | Run synthetic test |
| `POST /sentinel/register` | ✅ JWT | Register agent |
| `GET /quota/status` | ✅ JWT | Quota usage per provider |
| `POST /quota/flush` | ✅ JWT | Flush pending quota records to DB |

---

## Phase 3 → Phase 4 Handoff Checklist

- [x] `revision_items` + `revision_events` tables populated by `RevisionService`
- [x] SRS algorithm versioned (`v1`), INV-003 guard implemented and tested
- [x] Sentinel polls agents and computes health scores
- [x] Quota Guardian integrated into ModelRouter — EMERGENCY mode blocks AI
- [x] NotificationService pipeline complete with presence + dedup
- [x] `presence_state`, `presence_events`, `playlists`, `lectures`, `lecture_progress` tables created (ready for Phase 4)
- [x] All Phase 3 requirements marked `implemented` in REQUIREMENTS_MATRIX.md
- [x] Web Revision tab, Home radar, and System Health screen updated with live data
- [x] ~53 new tests, all passing with mocked clients
- [x] `apps/api/src/app.ts` registers all Phase 3 routes

---

## Phase 4 Preview

**Goal:** The system now tracks mistakes, knows the student's presence state, and can control lecture playback.

**Phase 4 builds:**
```
MistakeService         Classify errors by type (10 categories)
                       Detect repeat patterns (3+ same concept + type)
                       Trigger repair sessions
                       Affects mastery + revision priority

PresenceAgent          State machine: UNKNOWN → AVAILABLE/STUDYING/AWAY/SLEEPING/OFFLINE
                       Signals: web session, local heartbeat, lecture activity
                       Confidence always < 1.0 (INV-009)

LectureService         Playlist management per chapter
LocalAgent             Playwright + Chromium on approved domains
                       Progress tracking + resume position
                       Emergency stop (INV-006)
                       LECTURE_COMPLETED → post-lecture recall questions
```

**Phase 4 exit criteria:**
```
✓ Wrong answer creates classified mistake with error_type
✓ 3 mistakes on same concept + type → mistake pattern detected
✓ MISTAKE_PATTERN_DETECTED event triggers repair session
✓ Presence state transitions correctly (AVAILABLE → STUDYING on session start)
✓ INV-009: presence confidence never equals 1.0 exactly
✓ Local agent opens only approved domains
✓ Lecture progress persists and resumes from last position
✓ LECTURE_COMPLETED triggers 3–5 recall questions
✓ Emergency stop halts all local agent activity
✓ All tests pass
```
