import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyllabusService } from "../services/syllabus.service.js";
import { TilluError } from "@tillu/utilities";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));

import { getServiceClient } from "@tillu/database";
const mockGetServiceClient = vi.mocked(getServiceClient);

const mockSubjects = [
  { id: "sub-1", name: "Physics",  code: "PHY", board: "CBSE", class: "12" },
  { id: "sub-2", name: "Chemistry", code: "CHE", board: "CBSE", class: "12" },
];

const mockChapters = [
  { id: "ch-1", subject_id: "sub-1", name: "Ray Optics",           sequence: 9, importance: 5 },
  { id: "ch-2", subject_id: "sub-1", name: "Electric Charges",     sequence: 1, importance: 5 },
];

const mockConcepts = [
  { id: "con-1", chapter_id: "ch-1", name: "Lens Formula",         importance: 5 },
  { id: "con-2", chapter_id: "ch-1", name: "Mirror Formula",       importance: 5 },
];

// ── getSubjects ───────────────────────────────────────────────────────────────

describe("SyllabusService.getSubjects", () => {
  it("returns subjects list ordered by name", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        order:  vi.fn().mockResolvedValue({ data: mockSubjects, error: null }),
      }),
    } as never);

    const service = new SyllabusService();
    const result = await service.getSubjects();
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("Physics");
  });

  it("returns empty array when no subjects found", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        order:  vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as never);

    const service = new SyllabusService();
    const result = await service.getSubjects();
    expect(result).toEqual([]);
  });
});

// ── getChapters ───────────────────────────────────────────────────────────────

describe("SyllabusService.getChapters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns chapters for a valid subject", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        order:  vi.fn().mockResolvedValue({ data: mockChapters, error: null }),
        single: vi.fn().mockResolvedValue({ data: mockSubjects[0], error: null }),
      })),
    } as never);

    const service = new SyllabusService();
    const result = await service.getChapters("sub-1");
    expect(result.chapters).toHaveLength(2);
    expect(result.subject.name).toBe("Physics");
  });

  it("throws NOT_FOUND for non-existent subject", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order:  vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as never);

    const service = new SyllabusService();
    const err = await service.getChapters("non-existent").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TilluError);
    expect((err as TilluError).code).toBe("NOT_FOUND");
  });
});

// ── getConcepts ───────────────────────────────────────────────────────────────

describe("SyllabusService.getConcepts", () => {
  it("returns concepts for a valid chapter", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        order:  vi.fn().mockResolvedValue({ data: mockConcepts, error: null }),
        single: vi.fn().mockResolvedValue({ data: mockChapters[0], error: null }),
      })),
    } as never);

    const service = new SyllabusService();
    const result = await service.getConcepts("ch-1");
    expect(result.concepts).toHaveLength(2);
    expect(result.chapter.name).toBe("Ray Optics");
  });

  it("throws NOT_FOUND for non-existent chapter", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order:  vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as never);

    const service = new SyllabusService();
    const err = await service.getConcepts("bad-chapter").catch((e: unknown) => e);
    expect((err as TilluError).code).toBe("NOT_FOUND");
  });
});
