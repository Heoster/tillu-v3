import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock node:fs before importing EmergencyStop
vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  existsSync:    vi.fn().mockReturnValue(false),
  mkdirSync:     vi.fn(),
  unlinkSync:    vi.fn(),
}));

// EmergencyStop uses static state — we need to reset between tests
// We import after the mock is set up

let EmergencyStop: typeof import("../emergency-stop.js").EmergencyStop;

beforeEach(async () => {
  vi.resetModules();
  vi.mock("node:fs", () => ({
    writeFileSync: vi.fn(),
    existsSync:    vi.fn().mockReturnValue(false),
    mkdirSync:     vi.fn(),
    unlinkSync:    vi.fn(),
  }));
  // Re-import to get fresh static state
  const mod = await import("../emergency-stop.js");
  EmergencyStop = mod.EmergencyStop;
  // Reset static state manually (since it's static)
  EmergencyStop.clearStopMarker();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── INV-006: Emergency stop tests ────────────────────────────────────────────

describe("EmergencyStop — INV-006", () => {
  it("starts not stopped", () => {
    expect(EmergencyStop.isStopped()).toBe(false);
    expect(EmergencyStop.getReason()).toBeNull();
  });

  it("marks agent as stopped after trigger()", async () => {
    await EmergencyStop.trigger("manual");
    expect(EmergencyStop.isStopped()).toBe(true);
    expect(EmergencyStop.getReason()).toBe("manual");
  });

  it("is idempotent — multiple trigger() calls don't throw", async () => {
    await EmergencyStop.trigger("manual");
    await expect(EmergencyStop.trigger("manual")).resolves.toBeUndefined();
    await expect(EmergencyStop.trigger("error")).resolves.toBeUndefined();
  });

  it("runs registered onStop callbacks", async () => {
    const cb1 = vi.fn().mockResolvedValue(undefined);
    const cb2 = vi.fn().mockResolvedValue(undefined);
    EmergencyStop.onStop(cb1);
    EmergencyStop.onStop(cb2);
    await EmergencyStop.trigger("manual");
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it("continues even if a callback throws", async () => {
    const failingCb  = vi.fn().mockRejectedValue(new Error("cleanup failed"));
    const successCb  = vi.fn().mockResolvedValue(undefined);
    EmergencyStop.onStop(failingCb);
    EmergencyStop.onStop(successCb);
    await expect(EmergencyStop.trigger("error")).resolves.toBeUndefined();
    expect(successCb).toHaveBeenCalled(); // second callback still ran
  });

  it("writes stop marker to disk", async () => {
    const { writeFileSync } = await import("node:fs");
    await EmergencyStop.trigger("domain_violation");
    expect(writeFileSync).toHaveBeenCalled();
  });

  it("clearStopMarker resets stopped state", () => {
    EmergencyStop.clearStopMarker();
    expect(EmergencyStop.isStopped()).toBe(false);
    expect(EmergencyStop.getReason()).toBeNull();
  });

  it("supports all stop reasons", async () => {
    const reasons = ["manual", "domain_violation", "error", "signal"] as const;
    for (const reason of reasons) {
      // Re-clear between iterations
      EmergencyStop.clearStopMarker();
      await EmergencyStop.trigger(reason);
      expect(EmergencyStop.getReason()).toBe(reason);
    }
  });
});

// ── DomainGuard tests ─────────────────────────────────────────────────────────

describe("DomainGuard", () => {
  let DomainGuard: typeof import("../domain-guard.js").DomainGuard;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../domain-guard.js");
    DomainGuard = mod.DomainGuard;
  });

  it("allows exact approved domain", () => {
    const guard = new DomainGuard(["youtube.com"]);
    expect(guard.isAllowed("https://youtube.com/watch?v=abc")).toBe(true);
  });

  it("allows subdomain of approved domain", () => {
    const guard = new DomainGuard(["youtube.com"]);
    expect(guard.isAllowed("https://www.youtube.com/watch?v=abc")).toBe(true);
  });

  it("blocks domain not in allowlist", () => {
    const guard = new DomainGuard(["youtube.com"]);
    expect(guard.isAllowed("https://google.com")).toBe(false);
    expect(guard.isAllowed("https://evil.com")).toBe(false);
  });

  it("blocks domain that contains approved domain as substring but is different", () => {
    const guard = new DomainGuard(["youtube.com"]);
    expect(guard.isAllowed("https://notyoutube.com")).toBe(false);
    expect(guard.isAllowed("https://youtube.com.evil.net")).toBe(false);
  });

  it("blocks malformed URLs", () => {
    const guard = new DomainGuard(["youtube.com"]);
    expect(guard.isAllowed("not-a-url")).toBe(false);
    expect(guard.isAllowed("")).toBe(false);
  });

  it("assertAllowed throws on blocked domain", () => {
    const guard = new DomainGuard(["youtube.com"]);
    expect(() => guard.assertAllowed("https://evil.com")).toThrow("DomainGuard");
  });

  it("assertAllowed does not throw on allowed domain", () => {
    const guard = new DomainGuard(["youtube.com"]);
    expect(() => guard.assertAllowed("https://youtube.com/watch?v=123")).not.toThrow();
  });

  it("case-insensitive domain matching", () => {
    const guard = new DomainGuard(["YouTube.com"]);
    expect(guard.isAllowed("https://YOUTUBE.COM/watch?v=abc")).toBe(true);
  });
});
