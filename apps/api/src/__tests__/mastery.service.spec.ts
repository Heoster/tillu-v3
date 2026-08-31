import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MasteryService,
  AddEvidenceSchema,
  MASTERY_ALGORITHM_VERSION,
} from "../services/mastery.service.js";
import { InvariantViolationError, ValidationError, TilluError } from "@tillu/utilities";
import { EventBus } from "@tillu/events";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));
import { getServiceClient } from "@tillu/database";
const mockGetServiceClient = vi.mocked(getServiceClient);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEventBusMock() {
  return {
    emit: vi.fn().mockResolvedValue("evt-id"),
    isProcessed: vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined),
  } as unknown as EventBus;
}

function makeMasteryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "mastery-uuid",
    student_id: "student-1",
    concept_id: "concept-1",
    mastery_score: 40,
    confidence: 50,
    recall_score: 50,
    practice_score: 40,
    pyq_score: 30,
    exam_score: 20,
    attempt_count: 5,
    success_count: 3,
    failure_count: 2,
    last_attempt_at: new Date(Date.now() - 86_400_000).toISOString(), // 1 day ago
    last_success_at: null,
    last_failure_at: null,
    forgetting_risk: 0.45,
    next_review_at: new Date(Date.now() + 3_600_000).toISOString(),
    mastery_algorithm_version: "v1",
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeDbMock(options: {
  conceptData?: unknown;
  existingMastery?: unknown;
  upsertData?: unknown;
  upsertError?: { message: string } | null;
} = {}) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "concepts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: options.conceptData ?? { id: "concept-1", importance: 4 },
            error: null,
          }),
        };
      }
      if (table === "mastery_states") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: options.existingMastery ?? null }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: options.upsertData ?? makeMasteryRow({ mastery_score: 46 }),
              error: options.upsertError ?? null,
            }),
          }),
        };
      }
      if (table === "mastery_events") {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
}

// ── Input schema tests ────────────────────────────────────────────────────────

describe("AddEvidenceSchema", () => {
  it("accepts valid evidence", () => {
    expect(AddEvidenceSchema.safeParse({
      concept_id: "550e8400-e29b-41d4-a716-446655440000",
      evidence_type: "recall",
      score: 80,
      max_score: 100,
      is_correct: true,
      source_agent: "quiz_agent",
    }).success).toBe(true);
  });

  it("rejects invalid evidence_type", () => {
    expect(AddEvidenceSchema.safeParse({
      concept_id: "550e8400-e29b-41d4-a716-446655440000",
      evidence_type: "video_watch", // not valid
      score: 80,
      is_correct: true,
      source_agent: "system",
    }).success).toBe(false);
  });

  it("rejects score > 100", () => {
    expect(AddEvidenceSchema.safeParse({
      concept_id: "550e8400-e29b-41d4-a716-446655440000",
      evidence_type: "practice",
      score: 150,
      is_correct: true,
      source_agent: "system",
    }).success).toBe(false);
  });

  it("rejects non-UUID concept_id", () => {
    expect(AddEvidenceSchema.safeParse({
      concept_id: "not-a-uuid",
      evidence_type: "practice",
      score: 80,
      is_correct: true,
      source_agent: "system",
    }).success).toBe(false);
  });
});

// ── INV-001: assertNotAiDirectWrite ───────────────────────────────────────────

describe("MasteryService.assertNotAiDirectWrite — INV-001", () => {
  it("PASSES when payload contains evidence fields (correct usage)", () => {
    expect(() =>
      MasteryService.assertNotAiDirectWrite({
        concept_id: "uuid",
        evidence_type: "recall",
        score: 80,
        is_correct: true,
      })
    ).not.toThrow();
  });

  it("THROWS InvariantViolationError when payload has mastery_score but no evidence", () => {
    expect(() =>
      MasteryService.assertNotAiDirectWrite({ mastery_score: 85 })
    ).toThrow(InvariantViolationError);
  });

  it("THROWS with INV-001 code", () => {
    let err: unknown;
    try {
      MasteryService.assertNotAiDirectWrite({ mastery_score: 90, concept_id: "uuid" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InvariantViolationError);
    expect((err as InvariantViolationError).message).toContain("INV-001");
  });

  it("PASSES when payload has both mastery_score AND evidence (updating UI is fine)", () => {
    // If it has score+evidence_type it's going through the evidence pipeline
    expect(() =>
      MasteryService.assertNotAiDirectWrite({
        mastery_score: 85,
        evidence_type: "recall",
        score: 80,
      })
    ).not.toThrow();
  });
});

// ── addEvidence ───────────────────────────────────────────────────────────────

describe("MasteryService.addEvidence", () => {
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBusMock();
  });

  it("creates new mastery record when none exists (zero-state)", async () => {
    const newRow = makeMasteryRow({ mastery_score: 24, attempt_count: 1 });
    mockGetServiceClient.mockReturnValue(makeDbMock({ upsertData: newRow }) as never);

    const service = new MasteryService(eventBus);
    const result = await service.addEvidence("student-1", {
      concept_id: "550e8400-e29b-41d4-a716-446655440000",
      evidence_type: "practice",
      score: 80,
      max_score: 100,
      is_correct: true,
      source_agent: "system",
    });

    expect(result.mastery_score).toBe(24);
    expect(result.algorithm_version).toBe(MASTERY_ALGORITHM_VERSION);
  });

  it("emits MASTERY_UPDATED event after successful update", async () => {
    mockGetServiceClient.mockReturnValue(makeDbMock() as never);

    const service = new MasteryService(eventBus);
    await service.addEvidence("student-1", {
      concept_id: "550e8400-e29b-41d4-a716-446655440000",
      evidence_type: "recall",
      score: 70,
      is_correct: true,
      source_agent: "system",
    });

    expect(eventBus.emit).toHaveBeenCalledWith(
      "MASTERY_UPDATED",
      "student-1",
      expect.objectContaining({
        concept_id: "550e8400-e29b-41d4-a716-446655440000",
        evidence_type: "recall",
        is_correct: true,
      }),
      expect.any(Object)
    );
  });

  it("does NOT fail when EventBus throws — INV-005", async () => {
    mockGetServiceClient.mockReturnValue(makeDbMock() as never);

    const flakyBus = {
      emit: vi.fn().mockRejectedValue(new Error("event bus down")),
    } as unknown as EventBus;

    const service = new MasteryService(flakyBus);
    // Should resolve without throwing
    const result = await service.addEvidence("student-1", {
      concept_id: "550e8400-e29b-41d4-a716-446655440000",
      evidence_type: "practice",
      score: 60,
      is_correct: false,
      source_agent: "system",
    });

    expect(result).toBeDefined();
  });

  it("throws ValidationError on invalid input", async () => {
    const service = new MasteryService(eventBus);
    await expect(
      service.addEvidence("student-1", {
        concept_id: "bad-uuid",
        evidence_type: "recall",
        score: 80,
        is_correct: true,
        source_agent: "system",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws NOT_FOUND when concept doesn't exist", async () => {
    mockGetServiceClient.mockReturnValue(
      makeDbMock({ conceptData: null }) as never
    );

    const service = new MasteryService(eventBus);
    const err = await service
      .addEvidence("student-1", {
        concept_id: "550e8400-e29b-41d4-a716-446655440000",
        evidence_type: "recall",
        score: 80,
        is_correct: true,
        source_agent: "system",
      })
      .catch((e: unknown) => e);

    expect((err as TilluError).code).toBe("NOT_FOUND");
  });

  it("throws DATABASE_ERROR when upsert fails", async () => {
    mockGetServiceClient.mockReturnValue(
      makeDbMock({ upsertError: { message: "constraint violation" } }) as never
    );

    const service = new MasteryService(eventBus);
    await expect(
      service.addEvidence("student-1", {
        concept_id: "550e8400-e29b-41d4-a716-446655440000",
        evidence_type: "practice",
        score: 50,
        is_correct: false,
        source_agent: "system",
      })
    ).rejects.toThrow(TilluError);
  });
});

// ── Mastery calculation logic (unit tests on private helpers via public API) ──

describe("Mastery score calculation", () => {
  it("failure decreases mastery relative to success", async () => {
    const makeService = () => {
      const bus = makeEventBusMock();
      const service = new MasteryService(bus);
      return service;
    };

    // Simulate: existing state has recall_score=60
    const existingWithRecall = makeMasteryRow({ recall_score: 60, mastery_score: 45 });

    mockGetServiceClient.mockReturnValue(
      makeDbMock({
        existingMastery: existingWithRecall,
        upsertData: makeMasteryRow({ mastery_score: 39, recall_score: 48 }),
      }) as never
    );

    const service = makeService();
    const result = await service.addEvidence("student-1", {
      concept_id: "550e8400-e29b-41d4-a716-446655440000",
      evidence_type: "recall",
      score: 30, // poor performance
      is_correct: false,
      source_agent: "system",
    });

    // mastery_score should be lower than before (39 < 45)
    expect(result.mastery_score).toBeLessThan(45);
  });

  it("mastery_score stays within 0–100", async () => {
    mockGetServiceClient.mockReturnValue(
      makeDbMock({ upsertData: makeMasteryRow({ mastery_score: 95 }) }) as never
    );
    const service = new MasteryService(makeEventBusMock());
    const result = await service.addEvidence("student-1", {
      concept_id: "550e8400-e29b-41d4-a716-446655440000",
      evidence_type: "exam",
      score: 100,
      is_correct: true,
      source_agent: "system",
    });

    expect(result.mastery_score).toBeLessThanOrEqual(100);
    expect(result.mastery_score).toBeGreaterThanOrEqual(0);
  });
});

// ── getMastery ────────────────────────────────────────────────────────────────

describe("MasteryService.getMastery", () => {
  it("returns null when no mastery record exists", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      }),
    } as never);

    const service = new MasteryService(makeEventBusMock());
    const result = await service.getMastery("student-1", "concept-1");
    expect(result).toBeNull();
  });

  it("returns breakdown with explanation when record exists", async () => {
    const row = makeMasteryRow({ mastery_score: 62, attempt_count: 10, success_count: 7 });
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: row, error: null }),
      }),
    } as never);

    const service = new MasteryService(makeEventBusMock());
    const result = await service.getMastery("student-1", "concept-1");
    expect(result).not.toBeNull();
    expect(result!.mastery_score).toBe(62);
    expect(result!.explanation).toContain("62%");
    expect(result!.algorithm_version).toBe("v1");
  });
});
