import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudyService, StartSessionSchema } from "../services/study.service.js";
import { ValidationError, TilluError } from "@tillu/utilities";
import { EventBus } from "@tillu/events";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));

import { getServiceClient } from "@tillu/database";
const mockGetServiceClient = vi.mocked(getServiceClient);

function makeEventBusMock() {
  return {
    emit:          vi.fn().mockResolvedValue("event-id-001"),
    isProcessed:   vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined),
  } as unknown as EventBus;
}

function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id:                   "session-uuid-001",
    student_id:           "student-uuid-001",
    subject_id:           null,
    chapter_id:           null,
    concept_id:           null,
    activity_type:        "practice",
    status:               "active",
    planned_duration_min: null,
    actual_duration_min:  null,
    started_at:           new Date(Date.now() - 60_000).toISOString(), // 1 min ago
    ended_at:             null,
    created_at:           new Date().toISOString(),
    ...overrides,
  };
}

// ── Schema validation ─────────────────────────────────────────────────────────

describe("StartSessionSchema", () => {
  it("accepts minimal valid input (no fields required)", () => {
    expect(StartSessionSchema.safeParse({}).success).toBe(true);
  });

  it("defaults activity_type to practice", () => {
    const result = StartSessionSchema.safeParse({});
    expect(result.success && result.data.activity_type).toBe("practice");
  });

  it("rejects invalid activity_type", () => {
    expect(StartSessionSchema.safeParse({ activity_type: "nap" }).success).toBe(false);
  });

  it("rejects planned_duration_min > 480", () => {
    expect(StartSessionSchema.safeParse({ planned_duration_min: 500 }).success).toBe(false);
  });

  it("rejects non-UUID subject_id", () => {
    expect(StartSessionSchema.safeParse({ subject_id: "not-uuid" }).success).toBe(false);
  });
});

// ── startSession ──────────────────────────────────────────────────────────────

describe("StudyService.startSession", () => {
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBusMock();
  });

  it("creates a session and emits SESSION_STARTED", async () => {
    const row = makeSessionRow();
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: row, error: null }),
        }),
      }),
    } as never);

    const service = new StudyService(eventBus);
    const result = await service.startSession("student-uuid-001", { activity_type: "practice" });

    expect(result.status).toBe("active");
    expect(result.activity_type).toBe("practice");
    expect(eventBus.emit).toHaveBeenCalledWith(
      "SESSION_STARTED",
      "student-uuid-001",
      expect.objectContaining({ session_id: row.id }),
      expect.any(Object)
    );
  });

  it("throws ValidationError on invalid input", async () => {
    const service = new StudyService(eventBus);
    await expect(
      service.startSession("student-1", { activity_type: "invalid" as never })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws TilluError if DB insert fails", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } }),
        }),
      }),
    } as never);

    const service = new StudyService(eventBus);
    await expect(service.startSession("student-1", {})).rejects.toBeInstanceOf(TilluError);
  });
});

// ── endSession ────────────────────────────────────────────────────────────────

describe("StudyService.endSession", () => {
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBusMock();
  });

  it("calculates actual_duration_min and emits SESSION_COMPLETED", async () => {
    const startedAt = new Date(Date.now() - 35 * 60_000).toISOString(); // 35 min ago
    const activeRow = makeSessionRow({ started_at: startedAt });
    const endedRow = { ...activeRow, status: "completed", actual_duration_min: 35, ended_at: new Date().toISOString() };

    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: activeRow, error: null }) // requireSessionOwner
          .mockResolvedValueOnce({ data: endedRow, error: null }),  // update
        update: vi.fn().mockReturnValue({
          eq:     vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: endedRow, error: null }),
        }),
      }),
    } as never);

    const service = new StudyService(eventBus);
    const result = await service.endSession("session-uuid-001", "student-uuid-001");

    expect(result.status).toBe("completed");
    expect(eventBus.emit).toHaveBeenCalledWith(
      "SESSION_COMPLETED",
      "student-uuid-001",
      expect.objectContaining({ actual_duration_min: expect.any(Number) }),
      expect.any(Object)
    );
  });

  it("throws NOT_FOUND if session doesn't belong to student", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      }),
    } as never);

    const service = new StudyService(eventBus);
    const err = await service
      .endSession("wrong-session", "student-1")
      .catch((e: unknown) => e);
    expect((err as TilluError).code).toBe("NOT_FOUND");
  });

  it("throws INVALID_STATE if session is already completed", async () => {
    const completedRow = makeSessionRow({ status: "completed" });
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: completedRow, error: null }),
      }),
    } as never);

    const service = new StudyService(eventBus);
    const err = await service
      .endSession("session-1", "student-1")
      .catch((e: unknown) => e);
    expect((err as TilluError).code).toBe("INVALID_STATE");
  });
});

// ── SESSION event emission does NOT fail the session ─────────────────────────
// INV-005 equivalent: failed event emit must not destroy the workflow

describe("StudyService — non-critical event failure", () => {
  it("still returns session even if EventBus.emit throws", async () => {
    const row = makeSessionRow();
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: row, error: null }),
        }),
      }),
    } as never);

    // EventBus that throws
    const flakyBus = {
      emit: vi.fn().mockRejectedValue(new Error("event bus down")),
    } as unknown as EventBus;

    const service = new StudyService(flakyBus);
    // Must NOT throw even though EventBus fails
    const result = await service.startSession("student-uuid-001", {});
    expect(result.id).toBe(row.id);
  });
});
