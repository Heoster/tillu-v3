# ADR-005 — Event-Driven Architecture with Append-Only Ledger

**Date:** Phase 0  
**Status:** Accepted

## Context

Tillu has many state transitions that need to trigger downstream effects:
- Quiz completed → mastery updates → revision reschedules → plan updates
- Mistake created → pattern detection → repair session → mastery update
- Lecture completed → recall questions → concept exposure → revision scheduled

These chains can be implemented with direct synchronous calls or through events.

## Decision

Use an **event-driven architecture** with an **append-only `events` table** in Supabase as the event ledger.

## Event Flow

```
Action occurs (quiz completed)
        ↓
Domain service runs (MasteryService.update())
        ↓
EventBus.emit(MASTERY_UPDATED, payload)
        ↓
events table ← INSERT (append-only)
        ↓
Event processors (synchronous or via n8n webhook)
        ↓
Downstream effects (revision reschedule, plan update)
```

## Idempotency

Every event consumer checks:
```sql
SELECT 1 FROM event_consumer_log
WHERE event_id = $1 AND consumer_id = $2
```
If already processed → skip. If not → process + insert log row.

This prevents duplicate effects from duplicate events.

## Append-Only Principle

The `events` table is never updated or deleted. It is INSERT-only. This means:
- Full audit trail of everything that happened
- If a calculation has a bug, we can replay events to recalculate state
- State tables (`mastery_states`, `revision_items`) are derived from events — they can be rebuilt

## Event Envelope (required fields)

```typescript
{
  id: uuid,
  event_type: string,       // "QUIZ_COMPLETED"
  schema_version: string,   // "v1"
  source: string,           // "quiz_agent"
  actor_id: uuid,           // student_id
  correlation_id: uuid,     // groups events from one user action
  trace_id: uuid,           // distributed trace
  payload: object,          // event-specific data
  created_at: timestamp
}
```

## Reasons

- Decouples producers from consumers — quiz agent doesn't need to know about revision service.
- Audit trail — every state change is traceable to an event.
- Replay capability — critical for debugging and fixing bugs in derived state.
- Idempotency — safe to retry failed event processing.
- n8n can subscribe to events and trigger workflows without the core API needing to call n8n directly.

## Tradeoffs

- Eventually consistent — downstream effects are not always synchronous. For MVP, the most critical updates (mastery, revision) are processed synchronously within the same request to avoid stale UI.
- Storage grows over time — events are never deleted. Acceptable for MVP scale (one student).
- Query complexity for derived views — solved with materialized state tables that are updated by event processors.

## Consequences

- `packages/events` defines all event types, the `EventBus` class, and the idempotency check.
- New features that need to trigger downstream effects emit events rather than calling services directly.
- The `events` table has no DELETE permission in RLS.
