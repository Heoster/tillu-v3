import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

vi.mock("@tillu/database", () => ({
  getServiceClient: vi.fn(),
  createAnonClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

import { getServiceClient } from "@tillu/database";
const mockGetServiceClient = vi.mocked(getServiceClient);

describe("GET /health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required env vars
    process.env["SUPABASE_URL"] = "https://test.supabase.co";
    process.env["SUPABASE_ANON_KEY"] = "anon-key";
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "service-key";
    process.env["CORS_ORIGINS"] = "http://localhost:3000";
  });

  it("returns 200 and status ok when DB is reachable", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit:  vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as never);

    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.checks.api).toBe("ok");
    expect(res.body.checks.database).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("returns 503 when DB is unreachable", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit:  vi.fn().mockResolvedValue({ data: null, error: { message: "connection refused" } }),
      }),
    } as never);

    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.checks.database).toBe("error");
  });

  it("returns 404 for unknown routes", async () => {
    mockGetServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit:  vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as never);

    const app = createApp();
    const res = await request(app).get("/unknown-route");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
