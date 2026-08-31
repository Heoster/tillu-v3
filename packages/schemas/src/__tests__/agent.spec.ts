import { describe, it, expect } from "vitest";
import { AgentRequestSchema, AgentResponseSchema, AgentHealthResponseSchema } from "../agent.js";

const validRequest = {
  request_id: "550e8400-e29b-41d4-a716-446655440000",
  trace_id:   "550e8400-e29b-41d4-a716-446655440001",
  agent:      "quiz_agent",
  version:    "1.0.0",
  timestamp:  "2026-08-31T10:00:00.000Z",
  payload:    { concept_id: "abc" },
};

describe("AgentRequestSchema", () => {
  it("parses a valid request envelope", () => {
    const result = AgentRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("rejects missing request_id", () => {
    const { request_id: _, ...rest } = validRequest;
    expect(AgentRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid UUID in request_id", () => {
    expect(AgentRequestSchema.safeParse({ ...validRequest, request_id: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid semver version", () => {
    expect(AgentRequestSchema.safeParse({ ...validRequest, version: "v1" }).success).toBe(false);
  });

  it("rejects invalid ISO timestamp", () => {
    expect(AgentRequestSchema.safeParse({ ...validRequest, timestamp: "2026-13-40" }).success).toBe(false);
  });

  it("rejects empty agent name", () => {
    expect(AgentRequestSchema.safeParse({ ...validRequest, agent: "" }).success).toBe(false);
  });
});

describe("AgentResponseSchema", () => {
  it("parses a valid success response", () => {
    const response = {
      request_id: "550e8400-e29b-41d4-a716-446655440000",
      status:     "success",
      agent:      "quiz_agent",
      version:    "1.0.0",
      result:     { questions: [] },
      errors:     [],
      latency_ms: 342,
      timestamp:  "2026-08-31T10:00:00.342Z",
    };
    expect(AgentResponseSchema.safeParse(response).success).toBe(true);
  });

  it("parses a valid error response with null result", () => {
    const response = {
      request_id: "550e8400-e29b-41d4-a716-446655440000",
      status:     "error",
      agent:      "quiz_agent",
      version:    "1.0.0",
      result:     null,
      errors:     [{ code: "AI_UNAVAILABLE", message: "No provider available", recoverable: true }],
      latency_ms: 1000,
      timestamp:  "2026-08-31T10:00:01.000Z",
    };
    expect(AgentResponseSchema.safeParse(response).success).toBe(true);
  });

  it("rejects negative latency_ms", () => {
    const response = {
      request_id: "550e8400-e29b-41d4-a716-446655440000",
      status: "success", agent: "a", version: "1.0.0",
      result: null, errors: [], latency_ms: -1,
      timestamp: "2026-08-31T10:00:00.000Z",
    };
    expect(AgentResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe("AgentHealthResponseSchema", () => {
  it("parses a healthy response", () => {
    const health = {
      status: "ok",
      agent: "revision_agent",
      version: "1.2.0",
      uptime_sec: 3600,
      timestamp: "2026-08-31T10:00:00.000Z",
    };
    expect(AgentHealthResponseSchema.safeParse(health).success).toBe(true);
  });
});
