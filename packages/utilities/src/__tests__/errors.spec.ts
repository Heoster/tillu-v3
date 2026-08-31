import { describe, it, expect } from "vitest";
import {
  TilluError,
  ValidationError,
  AIError,
  AIOutputValidationError,
  AIUnavailableError,
  DatabaseError,
  AuthorizationError,
  InvariantViolationError,
  toApiError,
} from "../errors.js";

describe("TilluError", () => {
  it("creates error with correct properties", () => {
    const err = new TilluError("Something broke", "SOME_CODE", true, { detail: "x" });
    expect(err.message).toBe("Something broke");
    expect(err.code).toBe("SOME_CODE");
    expect(err.recoverable).toBe(true);
    expect(err.context).toEqual({ detail: "x" });
    expect(err instanceof TilluError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it("is instanceof TilluError across subclasses", () => {
    const v = new ValidationError("bad");
    expect(v instanceof TilluError).toBe(true);
    expect(v instanceof ValidationError).toBe(true);
    expect(v.recoverable).toBe(false);
  });
});

describe("ValidationError", () => {
  it("sets code VALIDATION_ERROR and recoverable false", () => {
    const e = new ValidationError("invalid input");
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.recoverable).toBe(false);
  });
});

describe("AIOutputValidationError", () => {
  it("is recoverable (retry is possible)", () => {
    const e = new AIOutputValidationError("bad json");
    expect(e.recoverable).toBe(true);
    expect(e.code).toBe("AI_OUTPUT_INVALID");
  });
});

describe("AIUnavailableError", () => {
  it("is recoverable with correct code", () => {
    const e = new AIUnavailableError();
    expect(e.code).toBe("AI_UNAVAILABLE");
    expect(e.recoverable).toBe(true);
  });
});

describe("DatabaseError", () => {
  it("is recoverable", () => {
    const e = new DatabaseError("connection lost");
    expect(e.code).toBe("DATABASE_ERROR");
    expect(e.recoverable).toBe(true);
  });
});

describe("AuthorizationError", () => {
  it("is NOT recoverable", () => {
    const e = new AuthorizationError("forbidden");
    expect(e.code).toBe("AUTHORIZATION_ERROR");
    expect(e.recoverable).toBe(false);
  });
});

describe("InvariantViolationError", () => {
  it("includes invariant name in message", () => {
    const e = new InvariantViolationError("INV-001");
    expect(e.message).toContain("INV-001");
    expect(e.recoverable).toBe(false);
  });
});

describe("toApiError", () => {
  it("converts TilluError to API shape", () => {
    const err = new ValidationError("bad data");
    const result = toApiError(err, "req-123");
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.request_id).toBe("req-123");
    expect(result.error.message).toBe("bad data");
  });

  it("converts unknown errors to safe generic message", () => {
    const result = toApiError(new Error("raw internal error"), "req-456");
    expect(result.error.code).toBe("INTERNAL_ERROR");
    expect(result.error.message).not.toContain("raw internal error");
    expect(result.error.request_id).toBe("req-456");
  });

  it("converts non-Error objects safely", () => {
    const result = toApiError("string error", "req-789");
    expect(result.error.code).toBe("INTERNAL_ERROR");
  });
});
