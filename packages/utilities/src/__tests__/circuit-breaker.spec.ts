import { describe, it, expect, vi, beforeEach } from "vitest";
import { CircuitBreaker } from "../circuit-breaker.js";

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 100, name: "test" });
  });

  it("starts CLOSED", () => {
    expect(cb.getState()).toBe("CLOSED");
  });

  it("stays CLOSED on success", async () => {
    await cb.execute(async () => "ok");
    expect(cb.getState()).toBe("CLOSED");
  });

  it("opens after failureThreshold failures", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("OPEN");
  });

  it("rejects immediately when OPEN", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow();
    }
    // Now OPEN — next call should be rejected without calling fn
    const spy = vi.fn().mockResolvedValue("x");
    await expect(cb.execute(spy)).rejects.toThrow("Circuit breaker OPEN");
    expect(spy).not.toHaveBeenCalled();
  });

  it("transitions to HALF_OPEN after cooldown", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow();
    }
    expect(cb.getState()).toBe("OPEN");

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 150));
    expect(cb.getState()).toBe("HALF_OPEN");
  });

  it("closes after successful HALF_OPEN test", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow();
    }
    await new Promise((r) => setTimeout(r, 150));
    expect(cb.getState()).toBe("HALF_OPEN");

    // Success in HALF_OPEN → CLOSED
    await cb.execute(async () => "ok");
    expect(cb.getState()).toBe("CLOSED");
  });

  it("re-opens after failure in HALF_OPEN", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow();
    }
    await new Promise((r) => setTimeout(r, 150));
    expect(cb.getState()).toBe("HALF_OPEN");

    await expect(cb.execute(failing)).rejects.toThrow();
    expect(cb.getState()).toBe("OPEN");
  });
});
