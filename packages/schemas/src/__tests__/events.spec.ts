import { describe, it, expect } from "vitest";
import { TilluEventSchema, EventType } from "../events.js";

const validEvent = {
  id:             "550e8400-e29b-41d4-a716-446655440000",
  event_type:     "SESSION_COMPLETED",
  schema_version: "v1",
  source:         "study_service",
  actor_id:       "550e8400-e29b-41d4-a716-446655440001",
  correlation_id: "550e8400-e29b-41d4-a716-446655440002",
  trace_id:       "550e8400-e29b-41d4-a716-446655440003",
  timestamp:      "2026-08-31T10:00:00.000Z",
  payload:        { session_id: "abc", duration_min: 35 },
};

describe("TilluEventSchema", () => {
  it("parses a valid event envelope", () => {
    expect(TilluEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it("rejects missing actor_id", () => {
    const { actor_id: _, ...rest } = validEvent;
    expect(TilluEventSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid UUID in trace_id", () => {
    expect(TilluEventSchema.safeParse({ ...validEvent, trace_id: "bad" }).success).toBe(false);
  });

  it("rejects invalid timestamp", () => {
    expect(TilluEventSchema.safeParse({ ...validEvent, timestamp: "not-a-date" }).success).toBe(false);
  });

  it("defaults schema_version to v1", () => {
    const { schema_version: _, ...rest } = validEvent;
    const result = TilluEventSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schema_version).toBe("v1");
    }
  });
});

describe("EventType constants", () => {
  it("SESSION_STARTED is defined", () => {
    expect(EventType.SESSION_STARTED).toBe("SESSION_STARTED");
  });

  it("MASTERY_UPDATED is defined", () => {
    expect(EventType.MASTERY_UPDATED).toBe("MASTERY_UPDATED");
  });

  it("REVISION_DUE is defined", () => {
    expect(EventType.REVISION_DUE).toBe("REVISION_DUE");
  });

  it("MISTAKE_CREATED is defined", () => {
    expect(EventType.MISTAKE_CREATED).toBe("MISTAKE_CREATED");
  });

  it("covers all 32 event types", () => {
    expect(Object.keys(EventType).length).toBe(32);
  });
});
