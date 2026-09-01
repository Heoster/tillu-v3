import { describe, it, expect, vi, beforeEach } from "vitest";
import { LectureService, UpdateProgressSchema } from "../services/lecture.service.js";
import { ValidationError, TilluError } from "@tillu/utilities";
import { EventBus } from "@tillu/events";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));
import { getServiceClient } from "@tillu/database";
const mockGet = vi.mocked(getServiceClient);

const STUDENT_ID  = "550e8400-e29b-41d4-a716-446655440001";
const LECTURE_ID  = "550e8400-e29b-41d4-a716-446655440010";
const PLAYLIST_ID = "550e8400-e29b-41d4-a716-446655440011";
const CHAPTER_ID  = "550e8400-e29b-41d4-a716-446655440012";

function makeEventBus(): EventBus {
  return {
    emit: vi.fn().mockResolvedValue("evt-id"),
    isProcessed: vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined),
  } as unknown as EventBus;
}

const LECTURE_ROW = { id: LECTURE_ID, title: "Ray Optics Lecture 1", duration_sec: 1800, playlist_id: PLAYLIST_ID };

// ── Schema tests ──────────────────────────────────────────────────────────────

describe("UpdateProgressSchema", () => {
  it("accepts valid position_sec", () => {
    expect(UpdateProgressSchema.safeParse({ position_sec: 120 }).success).toBe(true);
  });
  it("accepts with completed=true", () => {
    expect(UpdateProgressSchema.safeParse({ position_sec: 1800, completed: true }).success).toBe(true);
  });
  it("rejects negative position", () => {
    expect(UpdateProgressSchema.safeParse({ position_sec: -1 }).success).toBe(false);
  });
  it("rejects missing position_sec", () => {
    expect(UpdateProgressSchema.safeParse({}).success).toBe(false);
  });
});

// ── updateProgress ────────────────────────────────────────────────────────────

describe("LectureService.updateProgress", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeDb(options: {
    lectureData?: unknown;
    existingProgress?: unknown;
    upsertData?: unknown;
    chapterData?: unknown;
    conceptData?: unknown[];
  } = {}) {
    return {
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "lectures") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: options.lectureData ?? LECTURE_ROW, error: null }) };
        if (t === "lecture_progress") return {
          select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: options.existingProgress ?? null, error: null }),
          upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: options.upsertData ?? { id: "prog-1", student_id: STUDENT_ID, lecture_id: LECTURE_ID, position_sec: 120, completed: false }, error: null }) }),
        };
        if (t === "playlists") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { chapter_id: CHAPTER_ID }, error: null }) };
        if (t === "concepts") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: options.conceptData ?? [{ id: "c-1", name: "Lens Formula", importance: 5 }], error: null }) };
        return {};
      }),
    };
  }

  it("creates progress on first update and emits LECTURE_STARTED", async () => {
    mockGet.mockReturnValue(makeDb() as never);
    const bus = makeEventBus();
    const svc = new LectureService(bus);

    const result = await svc.updateProgress(STUDENT_ID, LECTURE_ID, { position_sec: 30 });

    expect(result).toBeDefined();
    expect(bus.emit).toHaveBeenCalledWith(
      "LECTURE_STARTED", STUDENT_ID,
      expect.objectContaining({ lecture_id: LECTURE_ID }),
      expect.any(Object)
    );
  });

  it("does NOT emit LECTURE_STARTED on subsequent updates (not first)", async () => {
    mockGet.mockReturnValue(makeDb({
      existingProgress: { id: "prog-1", position_sec: 30, completed: false },
    }) as never);
    const bus = makeEventBus();
    const svc = new LectureService(bus);
    await svc.updateProgress(STUDENT_ID, LECTURE_ID, { position_sec: 120 });

    const startedCalls = vi.mocked(bus.emit).mock.calls.filter((c) => c[0] === "LECTURE_STARTED");
    expect(startedCalls).toHaveLength(0);
  });

  it("emits LECTURE_COMPLETED with recall_questions when completed=true (first time)", async () => {
    mockGet.mockReturnValue(makeDb({
      existingProgress: { id: "prog-1", position_sec: 1700, completed: false },
      upsertData: { id: "prog-1", student_id: STUDENT_ID, lecture_id: LECTURE_ID, position_sec: 1800, completed: true },
    }) as never);
    const bus = makeEventBus();
    const svc = new LectureService(bus);
    await svc.updateProgress(STUDENT_ID, LECTURE_ID, { position_sec: 1800, completed: true });

    const completedCall = vi.mocked(bus.emit).mock.calls.find((c) => c[0] === "LECTURE_COMPLETED");
    expect(completedCall).toBeDefined();
    expect((completedCall?.[2] as { recall_questions?: unknown[] })?.recall_questions?.length).toBeGreaterThan(0);
  });

  it("does NOT emit LECTURE_COMPLETED twice (idempotent)", async () => {
    // Already completed
    mockGet.mockReturnValue(makeDb({
      existingProgress: { id: "prog-1", position_sec: 1800, completed: true },
      upsertData: { id: "prog-1", student_id: STUDENT_ID, lecture_id: LECTURE_ID, position_sec: 1800, completed: true },
    }) as never);
    const bus = makeEventBus();
    const svc = new LectureService(bus);
    await svc.updateProgress(STUDENT_ID, LECTURE_ID, { position_sec: 1800, completed: true });

    const completedCalls = vi.mocked(bus.emit).mock.calls.filter((c) => c[0] === "LECTURE_COMPLETED");
    expect(completedCalls).toHaveLength(0);
  });

  it("throws NOT_FOUND when lecture doesn't exist", async () => {
    mockGet.mockReturnValue(makeDb({ lectureData: null }) as never);
    const svc = new LectureService(makeEventBus());
    const err = await svc.updateProgress(STUDENT_ID, LECTURE_ID, { position_sec: 30 }).catch((e: unknown) => e);
    expect((err as TilluError).code).toBe("NOT_FOUND");
  });

  it("throws ValidationError on invalid input", async () => {
    const svc = new LectureService(makeEventBus());
    await expect(svc.updateProgress(STUDENT_ID, LECTURE_ID, { position_sec: -10 })).rejects.toBeInstanceOf(ValidationError);
  });
});

// ── getResumePosition ─────────────────────────────────────────────────────────

describe("LectureService.getResumePosition", () => {
  it("returns null when never watched", async () => {
    mockGet.mockReturnValue({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) }) } as never);
    const svc = new LectureService(makeEventBus());
    expect(await svc.getResumePosition(STUDENT_ID, LECTURE_ID)).toBeNull();
  });

  it("returns resume position with progress_pct", async () => {
    mockGet.mockReturnValue({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { position_sec: 900, duration_sec: 1800, completed: false, last_watched_at: new Date().toISOString() }, error: null }) }) } as never);
    const svc    = new LectureService(makeEventBus());
    const result = await svc.getResumePosition(STUDENT_ID, LECTURE_ID);
    expect(result?.position_sec).toBe(900);
    expect(result?.progress_pct).toBe(50); // 900/1800 = 50%
    expect(result?.completed).toBe(false);
  });
});

// ── Exposure ≠ learning (critical distinction) ────────────────────────────────

describe("LectureService — exposure ≠ learning invariant", () => {
  it("LECTURE_COMPLETED payload includes recall_questions (not mastery update)", async () => {
    const concepts = [
      { id: "c-1", name: "Snell's Law",  importance: 5 },
      { id: "c-2", name: "Lens Formula", importance: 4 },
    ];
    mockGet.mockReturnValue({
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "lectures")         return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: LECTURE_ROW, error: null }) };
        if (t === "lecture_progress") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { position_sec: 0, completed: false }, error: null }), upsert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "p-1", completed: true }, error: null }) }) };
        if (t === "playlists")        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { chapter_id: CHAPTER_ID }, error: null }) };
        if (t === "concepts")         return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: concepts, error: null }) };
        return {};
      }),
    } as never);

    const bus = makeEventBus();
    const svc = new LectureService(bus);
    await svc.updateProgress(STUDENT_ID, LECTURE_ID, { position_sec: 1800, completed: true });

    const completedCall = vi.mocked(bus.emit).mock.calls.find((c) => c[0] === "LECTURE_COMPLETED");
    const payload = completedCall?.[2] as { recall_questions?: Array<{ type: string }> };
    expect(payload?.recall_questions?.every((q) => q.type === "recall")).toBe(true);
    // No mastery update in the payload — mastery comes from recall answers, not lecture watching
    expect("mastery_update" in (payload ?? {})).toBe(false);
  });
});
