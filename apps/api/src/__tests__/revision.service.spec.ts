import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  RevisionService,
  CompleteRevisionSchema,
  ScheduleRevisionSchema,
  REVISION_ALGORITHM_VERSION,
} from "../services/revision.service.js";
import {
  InvariantViolationError,
  ValidationError,
  TilluError,
} from "@tillu/utilities";
import { EventBus } from "@tillu/events";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));
import { getServiceClient } from "@tillu/database";
const mockGet = vi.mocked(getServiceClient);

// ── Helpers ───────────────────────────────────────────────────────────────────

const STUDENT_ID  = "550e8400-e29b-41d4-a716-446655440001";
const CONCEPT_ID  = "550e8400-e29b-41d4-a716-446655440002";
const ITEM_ID     = "550e8400-e29b-41d4-a716-446655440003";

function makeEventBus(): EventBus {
  return {
    emit: vi.fn().mockResolvedValue("evt-id"),
    isProcessed: vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined),
  } as unknown as EventBus;
}

function makeRevisionItem(overrides: Record<string, unknown> = {}) {
  return {
    id:                          ITEM_ID,
    student_id:                  STUDENT_ID,
    concept_id:                  CONCEPT_ID,
    revision_type:               "recall",
    priority:                    0.5,
    difficulty:                  0.5,
    stability:                   2.0,
    last_review_at:              null,
    next_review_at:              new Date(Date.now() - 3_600_000).toISOString(), // 1h ago
    attempt_count:               2,
    success_count:               1,
    failure_count:               1,
    status:                      "active",
    revision_algorithm_version:  REVISION_ALGORITHM_VERSION,
    created_at:                  new Date().toISOString(),
    updated_at:                  new Date().toISOString(),
    ...overrides,
  };
}

// ── Schema validation ─────────────────────────────────────────────────────────

describe("ScheduleRevisionSchema", () => {
  it("accepts valid concept_id with default revision_type", () => {
    const r = ScheduleRevisionSchema.safeParse({ concept_id: CONCEPT_ID });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.revision_type).toBe("recall");
  });

  it("accepts all valid revision types", () => {
    const types = ["recall","formula","reaction","flashcard","concept_explanation","question","pyq","mixed"];
    for (const t of types) {
      expect(ScheduleRevisionSchema.safeParse({ concept_id: CONCEPT_ID, revision_type: t }).success).toBe(true);
    }
  });

  it("rejects non-UUID concept_id", () => {
    expect(ScheduleRevisionSchema.safeParse({ concept_id: "bad-uuid" }).success).toBe(false);
  });
});

describe("CompleteRevisionSchema", () => {
  it("accepts valid success with quality 5", () => {
    expect(CompleteRevisionSchema.safeParse({
      revision_item_id: ITEM_ID,
      outcome: "success",
      recall_quality: 5,
    }).success).toBe(true);
  });

  it("rejects recall_quality > 5", () => {
    expect(CompleteRevisionSchema.safeParse({
      revision_item_id: ITEM_ID,
      outcome: "success",
      recall_quality: 6,
    }).success).toBe(false);
  });

  it("rejects invalid outcome", () => {
    expect(CompleteRevisionSchema.safeParse({
      revision_item_id: ITEM_ID,
      outcome: "skipped",
      recall_quality: 3,
    }).success).toBe(false);
  });
});

// ── INV-003: assertAlgorithmVersion ───────────────────────────────────────────

describe("RevisionService.assertAlgorithmVersion — INV-003", () => {
  it("passes when stored version matches current", () => {
    expect(() => RevisionService.assertAlgorithmVersion("v1")).not.toThrow();
  });

  it("throws InvariantViolationError when stored version is different", () => {
    expect(() => RevisionService.assertAlgorithmVersion("v0")).toThrow(InvariantViolationError);
  });

  it("error message includes INV-003", () => {
    let err: unknown;
    try { RevisionService.assertAlgorithmVersion("v99"); } catch (e) { err = e; }
    expect((err as InvariantViolationError).message).toContain("INV-003");
  });

  it("throws for v2 when current is v1 — future migration guard", () => {
    expect(() => RevisionService.assertAlgorithmVersion("v2")).toThrow(InvariantViolationError);
  });
});

// ── scheduleRevision ──────────────────────────────────────────────────────────

describe("RevisionService.scheduleRevision", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new revision item and emits REVISION_SCHEDULED", async () => {
    const item = makeRevisionItem();
    mockGet.mockReturnValue({
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "concepts") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: CONCEPT_ID, importance: 4 }, error: null }) };
        if (t === "revision_items") return { upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: item, error: null }) }) };
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as never);

    const bus = makeEventBus();
    const svc = new RevisionService(bus);
    const result = await svc.scheduleRevision(STUDENT_ID, { concept_id: CONCEPT_ID });

    expect(result.id).toBe(ITEM_ID);
    expect(bus.emit).toHaveBeenCalledWith("REVISION_SCHEDULED", STUDENT_ID,
      expect.objectContaining({ concept_id: CONCEPT_ID }),
      expect.any(Object)
    );
  });

  it("throws NOT_FOUND for non-existent concept", async () => {
    mockGet.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    } as never);

    const svc = new RevisionService(makeEventBus());
    await expect(svc.scheduleRevision(STUDENT_ID, { concept_id: CONCEPT_ID })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws ValidationError on invalid input", async () => {
    const svc = new RevisionService(makeEventBus());
    await expect(svc.scheduleRevision(STUDENT_ID, { concept_id: "not-a-uuid" })).rejects.toBeInstanceOf(ValidationError);
  });
});

// ── completeRevision — interval calculation ────────────────────────────────────

describe("RevisionService.completeRevision — SRS intervals", () => {
  function makeDb(item: ReturnType<typeof makeRevisionItem>, conceptImportance = 4) {
    return {
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "revision_items") return {
          select: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: item, error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { ...item, attempt_count: item.attempt_count + 1 }, error: null }) }),
        };
        if (t === "concepts") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { importance: conceptImportance }, error: null }) };
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    };
  }

  it("resets interval to 4h on failure (recall_quality < 3)", async () => {
    mockGet.mockReturnValue(makeDb(makeRevisionItem()) as never);
    const svc = new RevisionService(makeEventBus());
    const result = await svc.completeRevision(STUDENT_ID, {
      revision_item_id: ITEM_ID, outcome: "failure", recall_quality: 1,
    });
    expect(result.interval_hours).toBe(4);
    expect(result.interval_hours).toBeLessThanOrEqual(8);
  });

  it("grows interval on success (recall_quality 5)", async () => {
    const item = makeRevisionItem({
      last_review_at: new Date(Date.now() - 24 * 3_600_000).toISOString(), // reviewed 24h ago
      stability: 2.0,
    });
    mockGet.mockReturnValue(makeDb(item) as never);
    const svc = new RevisionService(makeEventBus());
    const result = await svc.completeRevision(STUDENT_ID, {
      revision_item_id: ITEM_ID, outcome: "success", recall_quality: 5,
    });
    // 24h * 2.0 stability * 1.15 ease delta ≈ 55h — well above 4h minimum
    expect(result.interval_hours).toBeGreaterThan(20);
  });

  it("caps interval at 720h (30 days)", async () => {
    const item = makeRevisionItem({
      last_review_at: new Date(Date.now() - 700 * 3_600_000).toISOString(),
      stability:      2.5, // max ease
    });
    mockGet.mockReturnValue(makeDb(item) as never);
    const svc = new RevisionService(makeEventBus());
    const result = await svc.completeRevision(STUDENT_ID, {
      revision_item_id: ITEM_ID, outcome: "success", recall_quality: 5,
    });
    expect(result.interval_hours).toBeLessThanOrEqual(720);
  });

  it("emits REVISION_COMPLETED on success", async () => {
    mockGet.mockReturnValue(makeDb(makeRevisionItem()) as never);
    const bus = makeEventBus();
    const svc = new RevisionService(bus);
    await svc.completeRevision(STUDENT_ID, {
      revision_item_id: ITEM_ID, outcome: "success", recall_quality: 4,
    });
    expect(bus.emit).toHaveBeenCalledWith("REVISION_COMPLETED", STUDENT_ID, expect.any(Object), expect.any(Object));
  });

  it("emits REVISION_FAILED on failure", async () => {
    mockGet.mockReturnValue(makeDb(makeRevisionItem()) as never);
    const bus = makeEventBus();
    const svc = new RevisionService(bus);
    await svc.completeRevision(STUDENT_ID, {
      revision_item_id: ITEM_ID, outcome: "failure", recall_quality: 0,
    });
    expect(bus.emit).toHaveBeenCalledWith("REVISION_FAILED", STUDENT_ID, expect.any(Object), expect.any(Object));
  });

  it("throws NOT_FOUND when item doesn't belong to student", async () => {
    mockGet.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }) }),
    } as never);
    const svc = new RevisionService(makeEventBus());
    await expect(svc.completeRevision(STUDENT_ID, { revision_item_id: ITEM_ID, outcome: "success", recall_quality: 3 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws INV-003 when stored algorithm version mismatches", async () => {
    const wrongVersionItem = makeRevisionItem({ revision_algorithm_version: "v0" });
    mockGet.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: wrongVersionItem, error: null }) }),
    } as never);
    const svc = new RevisionService(makeEventBus());
    await expect(svc.completeRevision(STUDENT_ID, { revision_item_id: ITEM_ID, outcome: "success", recall_quality: 3 })).rejects.toBeInstanceOf(InvariantViolationError);
  });
});

// ── INV-003: reproducibility ──────────────────────────────────────────────────

describe("INV-003 — revision scheduling reproducibility", () => {
  it("same inputs always produce the same next_review_at (deterministic)", async () => {
    const fixedTime = new Date("2026-08-31T10:00:00.000Z");
    vi.setSystemTime(fixedTime);

    const item = makeRevisionItem({ stability: 2.0, last_review_at: null });

    const makeDbForItem = () => ({
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "revision_items") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: item, error: null }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: item, error: null }) }) };
        if (t === "concepts") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { importance: 4 }, error: null }) };
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    });

    // Run twice with identical inputs
    mockGet.mockReturnValue(makeDbForItem() as never);
    const svc1 = new RevisionService(makeEventBus());
    const r1 = await svc1.completeRevision(STUDENT_ID, { revision_item_id: ITEM_ID, outcome: "success", recall_quality: 4 });

    mockGet.mockReturnValue(makeDbForItem() as never);
    const svc2 = new RevisionService(makeEventBus());
    const r2 = await svc2.completeRevision(STUDENT_ID, { revision_item_id: ITEM_ID, outcome: "success", recall_quality: 4 });

    expect(r1.next_review_at).toBe(r2.next_review_at);
    expect(r1.interval_hours).toBe(r2.interval_hours);

    vi.useRealTimers();
  });
});
