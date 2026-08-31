import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QuotaGuardian } from "../quota-guardian.js";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("QuotaGuardian — mode transitions", () => {
  let qg: QuotaGuardian;

  beforeEach(() => {
    // Set low limits for predictable testing
    process.env["QUOTA_GROQ_DAILY_TOKENS"]     = "1000";
    process.env["QUOTA_CONSERVE_THRESHOLD"]    = "0.75";
    process.env["QUOTA_EMERGENCY_THRESHOLD"]   = "0.90";
    qg = new QuotaGuardian();
  });

  afterEach(() => {
    delete process.env["QUOTA_GROQ_DAILY_TOKENS"];
    delete process.env["QUOTA_CONSERVE_THRESHOLD"];
    delete process.env["QUOTA_EMERGENCY_THRESHOLD"];
  });

  it("starts in NORMAL mode with zero usage", () => {
    expect(qg.getModeForProvider("groq")).toBe("NORMAL");
    expect(qg.getOverallMode()).toBe("NORMAL");
  });

  it("transitions to CONSERVE at 75% usage", () => {
    qg.setUsage("groq", 750, 10); // 750/1000 = 75%
    expect(qg.getModeForProvider("groq")).toBe("CONSERVE");
  });

  it("transitions to EMERGENCY at 90% usage", () => {
    qg.setUsage("groq", 900, 15); // 90%
    expect(qg.getModeForProvider("groq")).toBe("EMERGENCY");
  });

  it("EMERGENCY at 100% usage", () => {
    qg.setUsage("groq", 1000, 20);
    expect(qg.getModeForProvider("groq")).toBe("EMERGENCY");
  });

  it("NORMAL below 75%", () => {
    qg.setUsage("groq", 740, 10); // 74%
    expect(qg.getModeForProvider("groq")).toBe("NORMAL");
  });
});

describe("QuotaGuardian.canUseProvider", () => {
  let qg: QuotaGuardian;

  beforeEach(() => {
    process.env["QUOTA_GROQ_DAILY_TOKENS"]   = "1000";
    process.env["QUOTA_CONSERVE_THRESHOLD"]  = "0.75";
    process.env["QUOTA_EMERGENCY_THRESHOLD"] = "0.90";
    qg = new QuotaGuardian();
  });

  afterEach(() => {
    delete process.env["QUOTA_GROQ_DAILY_TOKENS"];
    delete process.env["QUOTA_CONSERVE_THRESHOLD"];
    delete process.env["QUOTA_EMERGENCY_THRESHOLD"];
  });

  it("allows any task in NORMAL mode", () => {
    expect(qg.canUseProvider("groq", "quiz_generation")).toBe(true);
    expect(qg.canUseProvider("groq", "research")).toBe(true);
    expect(qg.canUseProvider("groq")).toBe(true);
  });

  it("blocks background tasks in CONSERVE mode", () => {
    qg.setUsage("groq", 800, 10); // CONSERVE
    expect(qg.canUseProvider("groq", "research")).toBe(false);
    expect(qg.canUseProvider("groq", "background_research")).toBe(false);
    expect(qg.canUseProvider("groq", "weekly_report")).toBe(false);
  });

  it("allows essential tasks in CONSERVE mode", () => {
    qg.setUsage("groq", 800, 10); // CONSERVE
    expect(qg.canUseProvider("groq", "quiz_generation")).toBe(true);
    expect(qg.canUseProvider("groq", "tutor_hint")).toBe(true);
    expect(qg.canUseProvider("groq", "planner")).toBe(true);
  });

  it("blocks ALL tasks in EMERGENCY mode", () => {
    qg.setUsage("groq", 950, 20); // EMERGENCY
    expect(qg.canUseProvider("groq", "quiz_generation")).toBe(false);
    expect(qg.canUseProvider("groq", "tutor_hint")).toBe(false);
    expect(qg.canUseProvider("groq")).toBe(false);
  });
});

describe("QuotaGuardian.recordUsage", () => {
  let qg: QuotaGuardian;

  beforeEach(() => {
    process.env["QUOTA_GROQ_DAILY_TOKENS"] = "1000";
    qg = new QuotaGuardian();
  });

  afterEach(() => {
    delete process.env["QUOTA_GROQ_DAILY_TOKENS"];
  });

  it("accumulates token usage across calls", () => {
    qg.recordUsage("groq", 100, "success", "llama-3.3", "quiz");
    qg.recordUsage("groq", 200, "success", "llama-3.3", "quiz");
    qg.recordUsage("groq", 50,  "error",   "llama-3.3", "research");

    const status = qg.getStatus();
    expect(status.providers["groq"]?.tokens).toBe(350);
    expect(status.providers["groq"]?.requests).toBe(3);
  });

  it("adds to pending queue for DB flush", () => {
    qg.recordUsage("groq", 500, "success");
    // Access pending via a flush call to a mock DB
    const insertFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockDb = { from: vi.fn().mockReturnValue({ insert: insertFn }) };

    void qg.flushToDb(mockDb as never);
    // After flush is called, pending should be cleared
    expect(insertFn).toHaveBeenCalled();
  });

  it("resets counter on new day (simulated)", () => {
    // Force reset by calling resetUsage directly
    qg.setUsage("groq", 900, 50); // EMERGENCY
    expect(qg.getModeForProvider("groq")).toBe("EMERGENCY");

    qg.resetUsage("groq");
    expect(qg.getModeForProvider("groq")).toBe("NORMAL");
  });
});

describe("QuotaGuardian.getStatus", () => {
  it("returns usage percentage", () => {
    process.env["QUOTA_GROQ_DAILY_TOKENS"] = "1000";
    const qg = new QuotaGuardian();
    qg.setUsage("groq", 750, 10);

    const status = qg.getStatus();
    expect(status.providers["groq"]?.usagePct).toBe(75.0);
    expect(status.providers["groq"]?.mode).toBe("CONSERVE");
    delete process.env["QUOTA_GROQ_DAILY_TOKENS"];
  });

  it("overall mode is worst across all providers", () => {
    process.env["QUOTA_GROQ_DAILY_TOKENS"]      = "1000";
    process.env["QUOTA_CEREBRAS_DAILY_TOKENS"]  = "1000";
    const qg = new QuotaGuardian();
    qg.setUsage("groq",     200,  5); // NORMAL
    qg.setUsage("cerebras", 900, 20); // EMERGENCY

    expect(qg.getOverallMode()).toBe("EMERGENCY");
    delete process.env["QUOTA_GROQ_DAILY_TOKENS"];
    delete process.env["QUOTA_CEREBRAS_DAILY_TOKENS"];
  });
});

describe("QuotaGuardian.flushToDb", () => {
  it("inserts pending records and clears the queue", async () => {
    const qg = new QuotaGuardian();
    qg.recordUsage("groq", 100, "success", "llama", "quiz");
    qg.recordUsage("groq", 50,  "error",   "llama", "tutor");

    const insertFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockDb = { from: vi.fn().mockReturnValue({ insert: insertFn }) };

    await qg.flushToDb(mockDb as never);

    const rows = insertFn.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.["provider"]).toBe("groq");
    expect(rows[0]?.["tokens_used"]).toBe(100);
    expect(rows[1]?.["status"]).toBe("error");
  });

  it("re-queues records on DB failure", async () => {
    const qg = new QuotaGuardian();
    qg.recordUsage("groq", 100, "success");

    const insertFn = vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
    const mockDb = { from: vi.fn().mockReturnValue({ insert: insertFn }) };

    await qg.flushToDb(mockDb as never);

    // Records should be re-queued — another flush attempt would try again
    const insertFn2 = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockDb2 = { from: vi.fn().mockReturnValue({ insert: insertFn2 }) };
    await qg.flushToDb(mockDb2 as never);

    expect(insertFn2).toHaveBeenCalled();
  });
});
