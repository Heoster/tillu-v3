import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus } from "../event-bus.js";
import { EventType } from "@tillu/schemas";

// ── Mock Supabase DB client ────────────────────────────────────────────────────

function makeMockDb(overrides: {
  insertError?: { message: string };
  consumerLogData?: unknown;
  consumerLogInsertError?: { message: string };
} = {}) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "events") {
        return {
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: overrides.insertError ?? null,
          }),
        };
      }
      if (table === "event_consumer_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: overrides.consumerLogData ?? null }),
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: overrides.consumerLogInsertError ?? null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("EventBus.emit", () => {
  it("inserts an event and returns a uuid", async () => {
    const db = makeMockDb();
    const bus = new EventBus(db);

    const id = await bus.emit(
      EventType.SESSION_STARTED,
      "student-uuid-0001",
      { session_id: "sess-001" }
    );

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(db.from).toHaveBeenCalledWith("events");
  });

  it("throws DatabaseError when supabase insert fails", async () => {
    const db = makeMockDb({ insertError: { message: "DB write failed" } });
    const bus = new EventBus(db);

    await expect(
      bus.emit(EventType.SESSION_COMPLETED, "student-id", { session_id: "s1" })
    ).rejects.toThrow("Failed to emit event");
  });

  it("uses provided correlation_id in the payload", async () => {
    const db = makeMockDb();
    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    db.from.mockImplementation(() => ({ insert: insertSpy }));

    const bus = new EventBus(db);
    await bus.emit(
      EventType.QUIZ_COMPLETED,
      "student-id",
      {},
      { correlation_id: "corr-123", source: "quiz_agent" }
    );

    const insertArg = insertSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg["correlation_id"]).toBe("corr-123");
    expect(insertArg["source"]).toBe("quiz_agent");
  });

  it("validates envelope — throws on invalid actor_id", async () => {
    const db = makeMockDb();
    const bus = new EventBus(db);

    await expect(
      bus.emit(EventType.MASTERY_UPDATED, "not-a-uuid", {})
    ).rejects.toThrow();
  });
});

describe("EventBus.isProcessed", () => {
  it("returns false when consumer log has no entry", async () => {
    const db = makeMockDb({ consumerLogData: null });
    const bus = new EventBus(db);
    expect(await bus.isProcessed("evt-1", "mastery_service")).toBe(false);
  });

  it("returns true when consumer log has an entry", async () => {
    const db = makeMockDb({ consumerLogData: { event_id: "evt-1", consumer_id: "mastery_service" } });
    const bus = new EventBus(db);
    expect(await bus.isProcessed("evt-1", "mastery_service")).toBe(true);
  });
});

describe("EventBus.markProcessed", () => {
  it("inserts into event_consumer_log", async () => {
    const db = makeMockDb();
    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    db.from.mockImplementation((table: string) => {
      if (table === "event_consumer_log") return { insert: insertSpy, select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    const bus = new EventBus(db);
    await bus.markProcessed("evt-1", "revision_service");

    expect(insertSpy).toHaveBeenCalledWith({
      event_id: "evt-1",
      consumer_id: "revision_service",
    });
  });

  it("silently ignores duplicate key violations (idempotency)", async () => {
    const db = makeMockDb({
      consumerLogInsertError: { message: "duplicate key value violates unique constraint" },
    });
    const bus = new EventBus(db);
    // Should NOT throw
    await expect(bus.markProcessed("evt-1", "mastery_service")).resolves.toBeUndefined();
  });
});

// ── INV-004: Duplicate events must not cause duplicate study history ───────────
describe("INV-004 — idempotency invariant", () => {
  it("isProcessed returns true the second time markProcessed is called", async () => {
    let stored: Record<string, boolean> = {};
    const db = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "event_consumer_log") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => {
              const key = "evt-X::consumer-Y";
              return Promise.resolve({ data: stored[key] ? { event_id: "evt-X" } : null });
            }),
            insert: vi.fn().mockImplementation(() => {
              stored["evt-X::consumer-Y"] = true;
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    };

    const bus = new EventBus(db);

    expect(await bus.isProcessed("evt-X", "consumer-Y")).toBe(false);
    await bus.markProcessed("evt-X", "consumer-Y");
    expect(await bus.isProcessed("evt-X", "consumer-Y")).toBe(true);
  });
});
