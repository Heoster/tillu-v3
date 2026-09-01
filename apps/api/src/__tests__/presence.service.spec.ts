import { describe, it, expect, vi, beforeEach } from "vitest";
import { PresenceService } from "../services/presence.service.js";
import { InvariantViolationError, ValidationError } from "@tillu/utilities";
import { EventBus } from "@tillu/events";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));
import { getServiceClient } from "@tillu/database";
const mockGet = vi.mocked(getServiceClient);

const STUDENT_ID = "550e8400-e29b-41d4-a716-446655440001";

function makeEventBus(): EventBus {
  return {
    emit: vi.fn().mockResolvedValue("evt-id"),
    isProcessed: vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined),
  } as unknown as EventBus;
}

function makeDb(options: {
  existingPresence?: unknown;
  activeSessionCount?: number;
  activeLectureCount?: number;
  prefs?: Array<{ key: string; value: string }>;
  upsertData?: unknown;
} = {}) {
  return {
    from: vi.fn().mockImplementation((t: string) => {
      if (t === "presence_state") return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: options.existingPresence ?? null, error: null }),
        upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: options.upsertData ?? { state: "AVAILABLE", confidence: 0.35, source_signals: {}, student_id: STUDENT_ID, updated_at: new Date().toISOString() }, error: null }) }),
      };
      if (t === "study_sessions") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), count: options.activeSessionCount ?? 0, data: null };
      if (t === "lecture_progress") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), count: options.activeLectureCount ?? 0, data: null };
      if (t === "student_preferences") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: options.prefs ?? [], error: null }) };
      if (t === "presence_events") return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
    }),
  };
}

// ── INV-009: capConfidence ────────────────────────────────────────────────────

describe("PresenceService.capConfidence — INV-009", () => {
  it("returns value < 1.0 for any valid input", () => {
    expect(PresenceService.capConfidence(0.5)).toBe(0.5);
    expect(PresenceService.capConfidence(0.94)).toBe(0.94);
    expect(PresenceService.capConfidence(0.95)).toBe(0.95); // max
  });

  it("caps at 0.95 for values between 0.95 and 1.0 exclusive", () => {
    expect(PresenceService.capConfidence(0.97)).toBe(0.95);
    expect(PresenceService.capConfidence(0.999)).toBe(0.95);
  });

  it("THROWS InvariantViolationError when input is exactly 1.0", () => {
    expect(() => PresenceService.capConfidence(1.0)).toThrow(InvariantViolationError);
  });

  it("THROWS InvariantViolationError when input > 1.0", () => {
    expect(() => PresenceService.capConfidence(1.5)).toThrow(InvariantViolationError);
  });

  it("error message includes INV-009", () => {
    let err: unknown;
    try { PresenceService.capConfidence(1.0); } catch (e) { err = e; }
    expect((err as InvariantViolationError).message).toContain("INV-009");
  });
});

describe("PresenceService.assertConfidenceInvariant — INV-009", () => {
  it("passes for confidence < 1.0", () => {
    expect(() => PresenceService.assertConfidenceInvariant(0.85)).not.toThrow();
    expect(() => PresenceService.assertConfidenceInvariant(0.95)).not.toThrow();
    expect(() => PresenceService.assertConfidenceInvariant(0)).not.toThrow();
  });

  it("THROWS for confidence = 1.0", () => {
    expect(() => PresenceService.assertConfidenceInvariant(1.0)).toThrow(InvariantViolationError);
  });

  it("THROWS for confidence > 1.0", () => {
    expect(() => PresenceService.assertConfidenceInvariant(1.001)).toThrow(InvariantViolationError);
  });
});

// ── Signal processing ────────────────────────────────────────────────────────

describe("PresenceService.processSignal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts web_session_active signal", async () => {
    mockGet.mockReturnValue(makeDb() as never);
    const svc = new PresenceService(makeEventBus());
    const result = await svc.processSignal(STUDENT_ID, { signal_type: "web_session_active" });
    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThan(1.0); // INV-009 always holds
  });

  it("transitions to STUDYING when study_session_open signal + active session in DB", async () => {
    mockGet.mockReturnValue(makeDb({
      activeSessionCount: 1,
      upsertData: { state: "STUDYING", confidence: 0.65, source_signals: {}, student_id: STUDENT_ID, updated_at: new Date().toISOString() },
    }) as never);

    const svc    = new PresenceService(makeEventBus());
    const result = await svc.processSignal(STUDENT_ID, { signal_type: "study_session_open" });
    expect(result.state).toBe("STUDYING");
  });

  it("explicit_away signal always transitions to AWAY", async () => {
    mockGet.mockReturnValue(makeDb({
      existingPresence: { state: "AVAILABLE", confidence: 0.75, source_signals: {}, updated_at: new Date().toISOString() },
      upsertData:       { state: "AWAY", confidence: 0.85, source_signals: {}, student_id: STUDENT_ID, updated_at: new Date().toISOString() },
    }) as never);

    const svc    = new PresenceService(makeEventBus());
    const result = await svc.processSignal(STUDENT_ID, { signal_type: "explicit_away" });
    expect(result.state).toBe("AWAY");
  });

  it("confidence in result is always < 1.0 (INV-009)", async () => {
    mockGet.mockReturnValue(makeDb({
      upsertData: { state: "AVAILABLE", confidence: 0.95, source_signals: {}, student_id: STUDENT_ID, updated_at: new Date().toISOString() },
    }) as never);

    const svc    = new PresenceService(makeEventBus());
    const result = await svc.processSignal(STUDENT_ID, { signal_type: "web_session_active" });
    expect(result.confidence).toBeLessThan(1.0);
  });

  it("throws ValidationError on unknown signal_type", async () => {
    const svc = new PresenceService(makeEventBus());
    await expect(
      svc.processSignal(STUDENT_ID, { signal_type: "keystroke" as never })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("emits PRESENCE_CHANGED when state changes", async () => {
    mockGet.mockReturnValue(makeDb({
      existingPresence: { state: "AVAILABLE", confidence: 0.5, source_signals: {}, updated_at: new Date().toISOString() },
      activeSessionCount: 1,
      upsertData: { state: "STUDYING", confidence: 0.65, source_signals: {}, student_id: STUDENT_ID, updated_at: new Date().toISOString() },
    }) as never);

    const bus = makeEventBus();
    const svc = new PresenceService(bus);
    await svc.processSignal(STUDENT_ID, { signal_type: "study_session_open" });

    expect(bus.emit).toHaveBeenCalledWith(
      "PRESENCE_CHANGED", STUDENT_ID,
      expect.objectContaining({ from_state: "AVAILABLE", to_state: "STUDYING" }),
      expect.any(Object)
    );
  });

  it("does NOT emit PRESENCE_CHANGED when state unchanged", async () => {
    mockGet.mockReturnValue(makeDb({
      existingPresence: { state: "AVAILABLE", confidence: 0.5, source_signals: {}, updated_at: new Date().toISOString() },
      upsertData: { state: "AVAILABLE", confidence: 0.60, source_signals: {}, student_id: STUDENT_ID, updated_at: new Date().toISOString() },
    }) as never);

    const bus = makeEventBus();
    const svc = new PresenceService(bus);
    await svc.processSignal(STUDENT_ID, { signal_type: "recent_api_call" });

    const presenceChangedCalls = vi.mocked(bus.emit).mock.calls.filter(
      (c) => c[0] === "PRESENCE_CHANGED"
    );
    expect(presenceChangedCalls).toHaveLength(0);
  });
});

// ── overridePresence ──────────────────────────────────────────────────────────

describe("PresenceService.overridePresence — INV-009", () => {
  it("confidence is capped at 0.90 for explicit override (not 1.0)", async () => {
    mockGet.mockReturnValue(makeDb({
      upsertData: { state: "STUDYING", confidence: 0.90, source_signals: {}, student_id: STUDENT_ID, updated_at: new Date().toISOString() },
    }) as never);

    const svc    = new PresenceService(makeEventBus());
    const result = await svc.overridePresence(STUDENT_ID, { state: "STUDYING" });
    expect(result.confidence).toBe(0.90);
    expect(result.confidence).toBeLessThan(1.0); // INV-009
  });

  it("accepts all 6 valid presence states", async () => {
    const states = ["UNKNOWN","AVAILABLE","STUDYING","AWAY","SLEEPING","OFFLINE"] as const;
    for (const state of states) {
      mockGet.mockReturnValue(makeDb({ upsertData: { state, confidence: 0.90, source_signals: {}, student_id: STUDENT_ID, updated_at: new Date().toISOString() } }) as never);
      const svc = new PresenceService(makeEventBus());
      const res = await svc.overridePresence(STUDENT_ID, { state });
      expect(res.state).toBe(state);
    }
  });

  it("throws ValidationError on invalid state", async () => {
    const svc = new PresenceService(makeEventBus());
    await expect(
      svc.overridePresence(STUDENT_ID, { state: "DANCING" as never })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
