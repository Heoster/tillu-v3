import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService, RegisterInputSchema, LoginInputSchema } from "../services/auth.service.js";
import { ValidationError } from "@tillu/utilities";

// Mock @supabase/supabase-js createClient
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// Mock @tillu/database
vi.mock("@tillu/database", () => ({
  getServiceClient: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "@tillu/database";

const mockCreateClient = vi.mocked(createClient);
const mockGetServiceClient = vi.mocked(getServiceClient);

function makeSupabaseMock(authOverride: Record<string, unknown> = {}) {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: {
          user: { id: "user-uuid-001", email: "test@example.com" },
          session: { access_token: "access-token", refresh_token: "refresh-token" },
        },
        error: null,
        ...authOverride,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          user: { id: "user-uuid-001", email: "test@example.com" },
          session: { access_token: "access-token", refresh_token: "refresh-token" },
        },
        error: null,
        ...authOverride,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

function makeDbMock() {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("RegisterInputSchema", () => {
  it("accepts valid input", () => {
    expect(
      RegisterInputSchema.safeParse({ name: "Heoster", email: "h@test.com", password: "pass1234" }).success
    ).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    expect(
      RegisterInputSchema.safeParse({ name: "A", email: "h@test.com", password: "pass1234" }).success
    ).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      RegisterInputSchema.safeParse({ name: "Heoster", email: "not-email", password: "pass1234" }).success
    ).toBe(false);
  });

  it("rejects password under 8 chars", () => {
    expect(
      RegisterInputSchema.safeParse({ name: "Heoster", email: "h@test.com", password: "short" }).success
    ).toBe(false);
  });
});

describe("LoginInputSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      LoginInputSchema.safeParse({ email: "h@test.com", password: "anypassword" }).success
    ).toBe(true);
  });

  it("rejects empty password", () => {
    expect(
      LoginInputSchema.safeParse({ email: "h@test.com", password: "" }).success
    ).toBe(false);
  });
});

describe("AuthService.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["SUPABASE_URL"] = "https://test.supabase.co";
    process.env["SUPABASE_ANON_KEY"] = "anon-key";
  });

  it("throws ValidationError on invalid input", async () => {
    const service = new AuthService();
    await expect(
      service.register({ name: "A", email: "bad", password: "short" })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("calls supabase.auth.signUp with correct email and password", async () => {
    const supabaseMock = makeSupabaseMock();
    mockCreateClient.mockReturnValue(supabaseMock as never);
    mockGetServiceClient.mockReturnValue(makeDbMock() as never);

    const service = new AuthService();
    const result = await service.register({
      name: "Heoster",
      email: "heoster@test.com",
      password: "securepass",
    });

    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "heoster@test.com", password: "securepass" })
    );
    expect(result.access_token).toBe("access-token");
    expect(result.user.email).toBe("test@example.com");
  });

  it("throws TilluError when Supabase returns an auth error", async () => {
    const supabaseMock = makeSupabaseMock();
    supabaseMock.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Email already registered" },
    });
    mockCreateClient.mockReturnValue(supabaseMock as never);

    const service = new AuthService();
    await expect(
      service.register({ name: "Heoster", email: "dup@test.com", password: "pass1234" })
    ).rejects.toThrow("Email already registered");
  });
});

describe("AuthService.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["SUPABASE_URL"] = "https://test.supabase.co";
    process.env["SUPABASE_ANON_KEY"] = "anon-key";
  });

  it("throws ValidationError on invalid email", async () => {
    const service = new AuthService();
    await expect(
      service.login({ email: "not-an-email", password: "pass" })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns tokens on success", async () => {
    const supabaseMock = makeSupabaseMock();
    mockCreateClient.mockReturnValue(supabaseMock as never);

    const service = new AuthService();
    const result = await service.login({ email: "h@test.com", password: "pass1234" });

    expect(result.access_token).toBe("access-token");
    expect(result.refresh_token).toBe("refresh-token");
  });

  it("throws on invalid credentials", async () => {
    const supabaseMock = makeSupabaseMock();
    supabaseMock.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid credentials" },
    });
    mockCreateClient.mockReturnValue(supabaseMock as never);

    const service = new AuthService();
    await expect(
      service.login({ email: "h@test.com", password: "wrongpass" })
    ).rejects.toThrow("Invalid email or password");
  });
});
