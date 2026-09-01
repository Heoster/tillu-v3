import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MistakeService,
  CreateMistakeSchema,
  ErrorTypeSchema,
} from "../services/mistake.service.js";
import { ValidationError, TilluError } from "@tillu/utilities";
import { EventBus } from "@tillu/events";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));
import { getServiceClient } from "@tillu/database";
const mockGet = vi.mocked(getServiceClient);

const STUDENT_ID  = "550e8400-e29b-41d4-a716-446655440001";
const CONCEPT_ID  = "550e8400-e29b-41d4-a716-446655440002";
const MISTAKE_ID  = "550e8400-e29b-41d4-a716-446655440003";
const PATTERN_ID  = "550e8400-e29b-41d4-a716-446655440004";

function makeEventBus(): EventBus {
  return {
    emit: vi.fn().mockResolvedValue("evt-id"),
    isProcessed: vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined),
  } as unknown as EventBus;
}

// ── Schema tests ──────────────────────────────────────────────────────────────

describe("CreateMistakeSchema", () => {
  it("accepts all 10 valid error types", () => {
    const types = [
      "conceptual","formula","calculation","sign",
      "unit","carelessness","misreading","memory",
      "time_pressure","presentation",
    ];
    for (const t of types) {
      expect(CreateMistakeSchema.safeParse({
        concept_id: CONCEPT_ID, error_type: t,
      }).success).toBe(true);
    }
  });

  it("rejects invalid error type", () => {
    expect(CreateMistakeSchema.safeParse({
      concept_id: CONCEPT_ID, error_type: "wrong_formula",
    }).success).toBe(false);
  });

  it("defaults severity to medium", () => {
    const r = CreateMistakeSchema.safeParse({ concept_id: CONCEPT_ID, error_type: "formula" });
    expect(r.success && r.data.severity).toBe("medium");
  });

  it("rejects non-UUID concept_id", () => {
    expect(CreateMistakeSchema.safeParse({
      concept_id: "bad-id", error_type: "formula",
    }).success).toBe(false);
  });

  it("accepts optional cause up to 500 chars", () => {
    expect(CreateMistakeSchema.safeParse({
      concept_id: CONCEPT_ID, error_type: "sign",
      cause: "Forgot negative sign in Coulomb's law",
    }).success).toBe(true);
  });
});

describe("ErrorTypeSchema", () => {
  it("has exactly 10 error types", () => {
    const types = ErrorTypeSchema.options;
    expect(types).toHaveLength(10);
  });
});

// ── createMistake ─────────────────────────────────────────────────────────────

describe("MistakeService.createMistake", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeDb(options: {
    conceptData?: unknown;
    prevCount?: number;
    mistakeRow?: unknown;
    patternCount?: number;
    patternData?: unknown;
  } = {}) {
    return {
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "concepts") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: options.conceptData ?? { id: CONCEPT_ID, name: "Ray Optics" }, error: null }) };
        if (t === "mistakes") return {
          select: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: options.mistakeRow ?? { id: MISTAKE_ID, student_id: STUDENT_ID, concept_id: CONCEPT_ID, error_type: "formula", severity: "medium", attempt_number: 1 }, error: null }) }),
          gte:    vi.fn().mockReturnThis(),
          // For count query
          data:   null,
          count:  options.prevCount ?? 0,
        };
        if (t === "mistake_patterns") return {
          select: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          gte:    vi.fn().mockReturnThis(),
          upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: options.patternData ?? null, error: null }) }),
          count:  options.patternCount ?? 0,
          data:   null,
        };
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
      }),
    };
  }

  it("creates a mistake and emits MISTAKE_CREATED", async () => {
    mockGet.mockReturnValue(makeDb() as never);
    const bus = makeEventBus();
    const svc = new MistakeService(bus);

    const result = await svc.createMistake(STUDENT_ID, {
      concept_id: CONCEPT_ID, error_type: "formula",
    });

    expect(result.mistake.id).toBe(MISTAKE_ID);
    expect(bus.emit).toHaveBeenCalledWith(
      "MISTAKE_CREATED", STUDENT_ID,
      expect.objectContaining({ concept_id: CONCEPT_ID, error_type: "formula" }),
      expect.any(Object)
    );
  });

  it("throws NOT_FOUND when concept doesn't exist", async () => {
    mockGet.mockReturnValue(makeDb({ conceptData: null }) as never);
    const svc = new MistakeService(makeEventBus());
    const err = await svc.createMistake(STUDENT_ID, { concept_id: CONCEPT_ID, error_type: "formula" }).catch((e: unknown) => e);
    expect((err as TilluError).code).toBe("NOT_FOUND");
  });

  it("throws ValidationError on invalid error_type", async () => {
    const svc = new MistakeService(makeEventBus());
    await expect(svc.createMistake(STUDENT_ID, {
      concept_id: CONCEPT_ID, error_type: "bad_type" as never,
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it("does NOT fail if MISTAKE_CREATED event emit throws (INV-005)", async () => {
    mockGet.mockReturnValue(makeDb() as never);
    const flakyBus = { emit: vi.fn().mockRejectedValue(new Error("bus down")) } as unknown as EventBus;
    const svc = new MistakeService(flakyBus);
    const result = await svc.createMistake(STUDENT_ID, { concept_id: CONCEPT_ID, error_type: "formula" });
    expect(result.mistake).toBeDefined();
  });
});

// ── Pattern detection ─────────────────────────────────────────────────────────

describe("MistakeService — pattern detection (threshold = 3)", () => {
  it("returns null when fewer than 3 mistakes on same concept+type", async () => {
    mockGet.mockReturnValue({
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "concepts")         return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: CONCEPT_ID, name: "RC" }, error: null }) };
        if (t === "mistakes")         return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: MISTAKE_ID, concept_id: CONCEPT_ID, error_type: "sign", severity: "medium", attempt_number: 2 }, error: null }) }), count: 2, data: null };
        if (t === "mistake_patterns") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), count: 2, data: null, upsert: vi.fn() };
        return {};
      }),
    } as never);

    const svc = new MistakeService(makeEventBus());
    const { pattern } = await svc.createMistake(STUDENT_ID, { concept_id: CONCEPT_ID, error_type: "sign" });
    expect(pattern).toBeNull();
  });

  it("emits MISTAKE_PATTERN_DETECTED when 3+ mistakes on same concept+type", async () => {
    const patternRow = { id: PATTERN_ID, student_id: STUDENT_ID, concept_id: CONCEPT_ID, error_type: "formula", frequency: 3, severity: "low", status: "active" };
    mockGet.mockReturnValue({
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "concepts")         return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: CONCEPT_ID, name: "RC" }, error: null }) };
        if (t === "mistakes")         return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: MISTAKE_ID, concept_id: CONCEPT_ID, error_type: "formula", severity: "medium", attempt_number: 3 }, error: null }) }), count: 3, data: null };
        if (t === "mistake_patterns") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), count: 3, data: null, upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: patternRow, error: null }) }) };
        return {};
      }),
    } as never);

    const bus = makeEventBus();
    const svc = new MistakeService(bus);
    await svc.createMistake(STUDENT_ID, { concept_id: CONCEPT_ID, error_type: "formula" });

    expect(bus.emit).toHaveBeenCalledWith(
      "MISTAKE_PATTERN_DETECTED", STUDENT_ID,
      expect.objectContaining({ concept_id: CONCEPT_ID, error_type: "formula", frequency: 3 }),
      expect.any(Object)
    );
  });
});

// ── Repair plan ───────────────────────────────────────────────────────────────

describe("MistakeService.startRepairSession", () => {
  it("returns a 5-step repair plan", async () => {
    mockGet.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: PATTERN_ID, concept_id: CONCEPT_ID, error_type: "formula", frequency: 3, severity: "low", concepts: { name: "Lens Formula" } }, error: null }),
      }),
    } as never);

    const svc  = new MistakeService(makeEventBus());
    const plan = await svc.startRepairSession(STUDENT_ID, PATTERN_ID);

    expect(plan.steps).toHaveLength(5);
    expect(plan.steps[0]?.type).toBe("micro_lesson");
    expect(plan.steps[4]?.type).toBe("delayed_recall");
    expect(plan.estimated_total_min).toBeGreaterThan(0);
    expect(plan.concept_name).toBe("Lens Formula");
  });

  it("throws NOT_FOUND for unknown pattern", async () => {
    mockGet.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as never);

    const svc = new MistakeService(makeEventBus());
    const err = await svc.startRepairSession(STUDENT_ID, PATTERN_ID).catch((e: unknown) => e);
    expect((err as TilluError).code).toBe("NOT_FOUND");
  });
});
