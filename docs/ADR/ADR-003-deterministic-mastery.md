# ADR-003 — Deterministic Mastery (AI Cannot Write Final Score)

**Date:** Phase 0  
**Status:** Accepted — Critical invariant INV-001

## Context

Mastery scores represent the student's academic performance. They affect revision scheduling, planning, and recommendations. The question is whether to let AI agents directly assign mastery scores.

Options considered:
1. AI agent calculates and writes mastery score directly
2. AI agent suggests a score; human confirms before writing
3. Deterministic algorithm calculates score from evidence; AI only classifies evidence

## Decision

**Option 3.** `MasteryService` owns all mastery computation. AI agents contribute classified evidence (error type, difficulty estimation, concept mapping) but never call a write operation on `mastery_states` directly.

## Reasons

- LLMs are non-deterministic — the same evidence could produce different scores on different runs.
- LLMs hallucinate — a model could assign a high mastery score with no evidence.
- Historical study records are high-stakes data for a student preparing for board exams.
- Reproducibility matters: `revision_algorithm_version` must mean something. If AI wrote mastery, replaying history would produce different results.
- Auditability: the `mastery_events` table records every evidence item that contributed to the score. This is impossible if AI writes directly.
- Debugging: if mastery is wrong, we can trace every event. If AI wrote it, we cannot.

## The Boundary

```
AI agents CAN:
  - classify error type on a wrong answer
  - estimate question difficulty
  - extract concepts from a lecture
  - suggest evidence weight adjustments (as config, not runtime writes)

AI agents CANNOT:
  - call INSERT/UPDATE on mastery_states
  - call INSERT/UPDATE on mastery_events
  - call INSERT/UPDATE on study_sessions (historical records)
  - call INSERT/UPDATE on test_attempts
```

## Enforcement

- `MasteryService` in `apps/api/src/services/mastery.service.ts` is the ONLY code that writes to `mastery_states`.
- RLS policy on `mastery_states`: service-role writes only from a whitelisted set of operations.
- Invariant test `mastery-invariants.spec.ts` verifies that calling the mastery endpoint with AI-sourced payload without going through `MasteryService` is rejected.

## Tradeoffs

- The mastery algorithm must be maintained by engineers, not by prompting. Worth it: the algorithm is the product's most important deterministic component.
- AI-classified evidence (error type) feeds the algorithm but doesn't control it. If AI classification is wrong, the impact is bounded.

## Consequences

- `MasteryService` is a domain service, not an agent.
- Every mastery change creates a `mastery_events` record with full evidence.
- `mastery_algorithm_version` is stored on every `mastery_states` row to allow future recalculation.
