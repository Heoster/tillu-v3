import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FormulaService,
  SubmitRecallSchema,
} from "../services/formula.service.js";
import { TilluError, ValidationError } from "@tillu/utilities";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));
import { getServiceClient } from "@tillu/database";
const mockGetServiceClient = vi.mocked(getServiceClient);

const FORMULA_ID = "550e8400-e29b-41d4-a716-446655440010";
const STUDENT_ID = "550e8400-e29b-41d4-a716-446655440001";

function makeFormula(overrides: Record<string, unknown> = {}) {
  return { id: FORMULA_ID, name: "Lens Formula", expression: "1/v - 1/u = 1/f", importance: 5, subject_id: "sub-1", ...overrides };
}

// ── Schema tests ──────────────────────────────────────────────────────────────

describe("SubmitRecallSchema", () => {
  it("accepts recalled outcome", () => {
    expect(SubmitRecallSchema.safeParse({ formula_id: FORMULA_ID, outcome: "recalled" }).success).toBe(true);
  });
  it("accepts partial outcome with student_answer", () => {
    expect(SubmitRecallSchema.safeParse({ formula_id: FORMULA_ID, outcome: "partial", student_answer: "1/v + 1/u = 1/f" }).success).toBe(true);
  });
  it("rejects invalid outcome", () => {
    expect(SubmitRecallSchema.safeParse({ formula_id: FORMULA_ID, outcome: "guessed" }).success).toBe(false);
  });
  it("rejects non-UUID formula_id", () => {
    expect(SubmitRecallSchema.safeParse({ formula_id: "bad", outcome: "recalled" }).success).toBe(false);
  });
});

// ── submitRecall ──────────────────────────────────────────────────────────────

describe("FormulaService.submitRecall", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a review record and returns next_review_at", async () => {
    const reviewRow = { id: "review-1", student_id: STUDENT_ID, formula_id: FORMULA_ID, outcome: "recalled", next_review_at: null, created_at: new Date().toISOString() };
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "formulas") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: makeFormula(), error: null }) };
        if (table === "formula_reviews") return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: reviewRow, error: null }) }) };
        return {};
      }),
    } as never);

    const service = new FormulaService();
    const result = await service.submitRecall(STUDENT_ID, { formula_id: FORMULA_ID, outcome: "recalled" });

    expect(result.outcome).toBe("recalled");
    expect(result.next_review_at).toBeDefined();
    // Recalled → 48 hours from now
    const nextMs = new Date(result.next_review_at).getTime();
    const diffHours = (nextMs - Date.now()) / 3_600_000;
    expect(diffHours).toBeGreaterThan(47);
    expect(diffHours).toBeLessThan(49);
  });

  it("schedules sooner review on failed recall (4h)", async () => {
    const reviewRow = { id: "r-2", student_id: STUDENT_ID, formula_id: FORMULA_ID, outcome: "failed", next_review_at: null, created_at: new Date().toISOString() };
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "formulas") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: makeFormula(), error: null }) };
        if (table === "formula_reviews") return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: reviewRow, error: null }) }) };
        return {};
      }),
    } as never);

    const service = new FormulaService();
    const result = await service.submitRecall(STUDENT_ID, { formula_id: FORMULA_ID, outcome: "failed" });

    const diffHours = (new Date(result.next_review_at).getTime() - Date.now()) / 3_600_000;
    expect(diffHours).toBeGreaterThan(3.9);
    expect(diffHours).toBeLessThan(4.1);
  });

  it("throws NOT_FOUND when formula doesn't exist", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }) }),
    } as never);

    const service = new FormulaService();
    const err = await service.submitRecall(STUDENT_ID, { formula_id: FORMULA_ID, outcome: "recalled" }).catch((e: unknown) => e);
    expect((err as TilluError).code).toBe("NOT_FOUND");
  });

  it("throws ValidationError on invalid input", async () => {
    const service = new FormulaService();
    await expect(service.submitRecall(STUDENT_ID, { formula_id: "bad", outcome: "recalled" })).rejects.toBeInstanceOf(ValidationError);
  });
});

// ── getDailyRecallList ────────────────────────────────────────────────────────

describe("FormulaService.getDailyRecallList", () => {
  it("includes formulas never reviewed", async () => {
    const formulaList = [makeFormula(), makeFormula({ id: "f-2", name: "Mirror Formula" })];

    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "formula_reviews") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) };
        if (table === "formulas") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: formulaList, error: null }) };
        return {};
      }),
    } as never);

    const service = new FormulaService();
    const result = await service.getDailyRecallList(STUDENT_ID);
    expect(result).toHaveLength(2);
  });

  it("excludes formulas whose next_review_at is in the future", async () => {
    const formulaList = [makeFormula(), makeFormula({ id: "f-2", name: "Mirror" })];
    const futureReview = new Date(Date.now() + 24 * 3_600_000).toISOString();

    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "formula_reviews") return {
          select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ formula_id: FORMULA_ID, outcome: "recalled", next_review_at: futureReview, created_at: new Date().toISOString() }], error: null }),
        };
        if (table === "formulas") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: formulaList, error: null }) };
        return {};
      }),
    } as never);

    const service = new FormulaService();
    const result = await service.getDailyRecallList(STUDENT_ID);
    // FORMULA_ID is not due → only the second formula (f-2, never reviewed) should appear
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("f-2");
  });
});

// ── getRecallStats ────────────────────────────────────────────────────────────

describe("FormulaService.getRecallStats", () => {
  it("counts latest outcome per formula correctly", async () => {
    const reviews = [
      { formula_id: "f-1", outcome: "recalled",  created_at: "2026-08-30T10:00:00Z" },
      { formula_id: "f-1", outcome: "failed",    created_at: "2026-08-29T10:00:00Z" }, // older
      { formula_id: "f-2", outcome: "partial",   created_at: "2026-08-30T12:00:00Z" },
      { formula_id: "f-3", outcome: "failed",    created_at: "2026-08-30T08:00:00Z" },
    ];

    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: reviews, error: null }),
      }),
    } as never);

    const service = new FormulaService();
    const stats = await service.getRecallStats(STUDENT_ID);

    // f-1 latest = recalled, f-2 = partial, f-3 = failed
    expect(stats.total).toBe(3);
    expect(stats.recalled).toBe(1);
    expect(stats.partial).toBe(1);
    expect(stats.failed).toBe(1);
  });
});
