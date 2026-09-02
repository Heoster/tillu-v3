import { z } from "zod";

export const AgentRequestSchema = z.object({
  version: z.literal("v1"),
  requestId: z.string().min(8).max(128),
  userId: z.string().min(1).max(128),
  tenantId: z.string().min(1).max(128).optional(),
  input: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

export type AgentRequest = z.infer<typeof AgentRequestSchema>;

export type AgentCitation = { title: string; url: string; excerpt?: string };
export type AgentUsage = { provider?: string; model?: string; inputTokens?: number; outputTokens?: number };
export type AgentResponse<T = unknown> = {
  version: "v1";
  requestId: string;
  agent: string;
  data: T;
  citations?: AgentCitation[];
  usage?: AgentUsage;
};

export type AgentHealth = { status: "ok" | "degraded"; agent: string; version: string; checks: Record<string, "ok" | "degraded" | "disabled"> };

export function okResponse<T>(agent: string, requestId: string, data: T, extras: Pick<AgentResponse<T>, "citations" | "usage"> = {}): AgentResponse<T> {
  return { version: "v1", requestId, agent, data, ...extras };
}
