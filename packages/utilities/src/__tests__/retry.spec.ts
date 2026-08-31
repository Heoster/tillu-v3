import { describe, it, expect, vi } from "vitest";
import { retry, withTimeout, sleep } from "../retry.js";

describe("retry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on 2nd attempt", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 2) throw new Error("fail");
      return "success";
    });
    const result = await retry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws last error after maxAttempts exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(retry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects shouldRetry — stops early when shouldRetry returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("non-retryable"));
    await expect(
      retry(fn, {
        maxAttempts: 5,
        baseDelayMs: 1,
        shouldRetry: () => false,
      })
    ).rejects.toThrow("non-retryable");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("withTimeout", () => {
  it("resolves when operation completes in time", async () => {
    const result = await withTimeout(async () => "done", 1000);
    expect(result).toBe("done");
  });

  it("rejects when operation exceeds timeout", async () => {
    await expect(
      withTimeout(() => sleep(500), 10, "slow_op")
    ).rejects.toThrow("slow_op timed out after 10ms");
  });
});
