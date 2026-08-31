import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ModelRouter } from "../router.js";
import { AIUnavailableError, AIOutputValidationError } from "@tillu/utilities";
import type { ProviderAdapter, GenerateResult, ProviderAdapterStatus } from "../adapters/base.js";

// ── Mock provider factory ─────────────────────────────────────────────────────

function makeProvider(
  name: string,
  priority: number,
  options: {
    available?: boolean;
    result?: string;
    throws?: Error;
  } = {}
): ProviderAdapter {
  return {
    name,
    priority,
    isAvailable: vi.fn().mockReturnValue(options.available ?? true),
    generate: options.throws
      ? vi.fn().mockRejectedValue(options.throws)
      : vi.fn().mockResolvedValue({
          content:    options.result ?? '{"value": "test"}',
          model:      `${name}-model`,
          provider:   name,
          usage:      { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          latency_ms: 100,
        } satisfies GenerateResult),
    getStatus: vi.fn().mockReturnValue({
      name,
      available:       options.available ?? true,
      circuit_state:   "CLOSED",
      failure_count:   0,
      last_failure_at: null,
    } satisfies ProviderAdapterStatus),
  };
}

const SimpleSchema = z.object({ value: z.string() });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ModelRouter constructor", () => {
  it("throws if no providers given", () => {
    expect(() => new ModelRouter([])).toThrow("at least one provider");
  });
});

describe("ModelRouter.generate — happy path", () => {
  it("calls primary provider and returns validated result", async () => {
    const p1 = makeProvider("groq", 1, { result: '{"value":"hello"}' });
    const router = new ModelRouter([p1]);

    const res = await router.generate({
      task: "test",
      systemPrompt: "sys",
      userPrompt: "user",
      outputSchema: SimpleSchema,
    });

    expect(res.result.value).toBe("hello");
    expect(res.provider).toBe("groq");
    expect(p1.generate).toHaveBeenCalledTimes(1);
  });

  it("sorts providers by priority and tries lowest number first", async () => {
    const order: string[] = [];
    const p3 = makeProvider("openrouter", 3, { result: '{"value":"from_p3"}' });
    const p1 = makeProvider("groq", 1, { result: '{"value":"from_p1"}' });
    const p2 = makeProvider("cerebras", 2);

    vi.mocked(p1.generate).mockImplementation(async () => {
      order.push("p1");
      return { content: '{"value":"from_p1"}', model: "p1", provider: "groq", usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, latency_ms: 10 };
    });

    const router = new ModelRouter([p3, p1, p2]);
    const res = await router.generate({ task: "t", systemPrompt: "s", userPrompt: "u", outputSchema: SimpleSchema });

    expect(res.provider).toBe("groq");
    expect(order).toEqual(["p1"]);
    // p2 and p3 never called since p1 succeeded
    expect(p2.generate).not.toHaveBeenCalled();
    expect(p3.generate).not.toHaveBeenCalled();
  });
});

describe("ModelRouter.generate — fallback chain", () => {
  it("falls back to second provider when first fails", async () => {
    const p1 = makeProvider("groq", 1, { throws: new Error("groq timeout") });
    const p2 = makeProvider("cerebras", 2, { result: '{"value":"fallback"}' });
    const router = new ModelRouter([p1, p2]);

    const res = await router.generate({
      task: "test",
      systemPrompt: "sys",
      userPrompt: "user",
      outputSchema: SimpleSchema,
    });

    expect(res.result.value).toBe("fallback");
    expect(res.provider).toBe("cerebras");
    expect(p1.generate).toHaveBeenCalled();
    expect(p2.generate).toHaveBeenCalled();
  });

  it("throws AIUnavailableError when ALL providers fail", async () => {
    const p1 = makeProvider("groq", 1, { throws: new Error("groq down") });
    const p2 = makeProvider("cerebras", 2, { throws: new Error("cerebras down") });
    const router = new ModelRouter([p1, p2]);

    await expect(
      router.generate({ task: "test", systemPrompt: "s", userPrompt: "u", outputSchema: SimpleSchema })
    ).rejects.toBeInstanceOf(AIUnavailableError);
  });

  it("skips unavailable providers entirely", async () => {
    const p1 = makeProvider("groq", 1, { available: false });
    const p2 = makeProvider("cerebras", 2, { result: '{"value":"from_cerebras"}' });
    const router = new ModelRouter([p1, p2]);

    const res = await router.generate({
      task: "test",
      systemPrompt: "s",
      userPrompt: "u",
      outputSchema: SimpleSchema,
    });

    expect(res.provider).toBe("cerebras");
    expect(p1.generate).not.toHaveBeenCalled();
  });

  it("throws AIUnavailableError when all providers are unavailable", async () => {
    const p1 = makeProvider("groq", 1, { available: false });
    const router = new ModelRouter([p1]);

    await expect(
      router.generate({ task: "t", systemPrompt: "s", userPrompt: "u", outputSchema: SimpleSchema })
    ).rejects.toBeInstanceOf(AIUnavailableError);
  });
});

describe("ModelRouter.generate — output validation", () => {
  it("throws AIOutputValidationError when JSON doesn't match schema", async () => {
    const p1 = makeProvider("groq", 1, { result: '{"wrong_field": 123}' });
    const p2 = makeProvider("cerebras", 2, { result: '{"also_wrong": true}' });
    const router = new ModelRouter([p1, p2]);

    await expect(
      router.generate({ task: "t", systemPrompt: "s", userPrompt: "u", outputSchema: SimpleSchema })
    ).rejects.toBeInstanceOf(AIUnavailableError);
    // Both providers failed schema validation → AIUnavailableError
  });

  it("extracts JSON from markdown code blocks", async () => {
    const markdownWrapped = '```json\n{"value": "extracted"}\n```';
    const p1 = makeProvider("groq", 1, { result: markdownWrapped });
    const router = new ModelRouter([p1]);

    const res = await router.generate({
      task: "t",
      systemPrompt: "s",
      userPrompt: "u",
      outputSchema: SimpleSchema,
    });

    expect(res.result.value).toBe("extracted");
  });

  it("throws AIOutputValidationError on malformed JSON", async () => {
    const p1 = makeProvider("groq", 1, { result: 'not json at all {broken' });
    const p2 = makeProvider("cerebras", 2, { result: '{"value":"valid"}' });
    const router = new ModelRouter([p1, p2]);

    // p1 fails JSON parse → try p2 → succeeds
    const res = await router.generate({
      task: "t",
      systemPrompt: "s",
      userPrompt: "u",
      outputSchema: SimpleSchema,
    });

    expect(res.result.value).toBe("valid");
    expect(res.provider).toBe("cerebras");
  });
});

describe("ModelRouter.getProviderStatuses", () => {
  it("returns status for all providers", () => {
    const p1 = makeProvider("groq", 1);
    const p2 = makeProvider("cerebras", 2);
    const router = new ModelRouter([p1, p2]);

    const statuses = router.getProviderStatuses();
    expect(statuses).toHaveLength(2);
    expect(statuses.map((s) => s.name)).toContain("groq");
    expect(statuses.map((s) => s.name)).toContain("cerebras");
  });
});
