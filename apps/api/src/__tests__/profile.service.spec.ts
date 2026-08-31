import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ProfileService,
  UpdateProfileSchema,
  UpdateSubjectsSchema,
  UpdateAvailabilitySchema,
} from "../services/profile.service.js";
import { ValidationError, TilluError } from "@tillu/utilities";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));

import { getServiceClient } from "@tillu/database";
const mockGetServiceClient = vi.mocked(getServiceClient);

// ── Schema validation tests ───────────────────────────────────────────────────

describe("UpdateProfileSchema", () => {
  it("accepts valid name and exam_date", () => {
    expect(UpdateProfileSchema.safeParse({ name: "Heoster", exam_date: "2027-03-15" }).success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    expect(UpdateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    expect(UpdateProfileSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("rejects invalid date format", () => {
    expect(UpdateProfileSchema.safeParse({ exam_date: "15-03-2027" }).success).toBe(false);
  });
});

describe("UpdateSubjectsSchema", () => {
  it("accepts array of valid UUIDs", () => {
    expect(
      UpdateSubjectsSchema.safeParse({
        subject_ids: ["550e8400-e29b-41d4-a716-446655440000"],
      }).success
    ).toBe(true);
  });

  it("rejects empty array", () => {
    expect(UpdateSubjectsSchema.safeParse({ subject_ids: [] }).success).toBe(false);
  });

  it("rejects non-UUID strings", () => {
    expect(UpdateSubjectsSchema.safeParse({ subject_ids: ["not-uuid"] }).success).toBe(false);
  });
});

describe("UpdateAvailabilitySchema", () => {
  it("accepts valid windows", () => {
    const input = {
      windows: [{ day: "mon", start_time: "16:00", end_time: "20:00" }],
      sleep_start: "23:00",
      sleep_end: "06:30",
    };
    expect(UpdateAvailabilitySchema.safeParse(input).success).toBe(true);
  });

  it("rejects invalid day", () => {
    const input = { windows: [{ day: "monday", start_time: "16:00", end_time: "20:00" }] };
    expect(UpdateAvailabilitySchema.safeParse(input).success).toBe(false);
  });

  it("rejects malformed time (no colon)", () => {
    const input = { windows: [{ day: "tue", start_time: "1600", end_time: "20:00" }] };
    expect(UpdateAvailabilitySchema.safeParse(input).success).toBe(false);
  });
});

// ── Service logic tests ───────────────────────────────────────────────────────

describe("ProfileService.getProfile", () => {
  it("throws NOT_FOUND when profile doesn't exist", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      }),
    } as never);

    const service = new ProfileService();
    const err = await service.getProfile("user-uuid").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TilluError);
    expect((err as TilluError).code).toBe("NOT_FOUND");
  });

  it("returns profile when found", async () => {
    const mockProfile = {
      id: "profile-1",
      user_id: "user-1",
      name: "Heoster",
      class: "12",
      board: "CBSE",
    };
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }),
    } as never);

    const service = new ProfileService();
    const result = await service.getProfile("user-1");
    expect(result.name).toBe("Heoster");
  });
});

describe("ProfileService.upsertProfile", () => {
  it("throws ValidationError on bad name", async () => {
    const service = new ProfileService();
    await expect(service.upsertProfile("user-1", { name: "X" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("calls update when profile already exists", async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "p-1", name: "Heoster" }, error: null }),
    });

    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "p-1" }, error: null }),
        update: updateFn,
        insert: vi.fn(),
      }),
    } as never);

    const service = new ProfileService();
    await service.upsertProfile("user-1", { name: "Heoster" });
    expect(updateFn).toHaveBeenCalled();
  });
});
