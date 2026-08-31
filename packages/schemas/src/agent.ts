import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";

/**
 * Standard agent request envelope.
 * Every POST /run call must use this schema.
 */
export const AgentRequestSchema = z.object({
  request_id: UuidSchema,
  trace_id: UuidSchema,
  agent: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  timestamp: IsoDateTimeSchema,
  payload: z.record(z.unknown()),
});

/**
 * Standard agent error item.
 */
export const AgentErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  recoverable: z.boolean(),
});

/**
 * Standard agent response envelope.
 * Every POST /run response must use this schema.
 */
export const AgentResponseSchema = z.object({
  request_id: UuidSchema,
  status: z.enum(["success", "error", "partial"]),
  agent: z.string().min(1),
  version: z.string(),
  result: z.unknown().nullable(),
  errors: z.array(AgentErrorSchema),
  latency_ms: z.number().int().nonnegative(),
  timestamp: IsoDateTimeSchema,
});

/**
 * Standard agent health response (GET /health).
 */
export const AgentHealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  agent: z.string(),
  version: z.string(),
  uptime_sec: z.number().int().nonnegative(),
  timestamp: IsoDateTimeSchema,
});

/**
 * Standard agent readiness response (GET /ready).
 */
export const AgentReadyResponseSchema = z.object({
  ready: z.boolean(),
  reason: z.string().optional(),
});

/**
 * Standard agent version response (GET /version).
 */
export const AgentVersionResponseSchema = z.object({
  agent: z.string(),
  version: z.string(),
  build: z.string().optional(),
});

// Inferred types
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
export type AgentError = z.infer<typeof AgentErrorSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AgentHealthResponse = z.infer<typeof AgentHealthResponseSchema>;
export type AgentReadyResponse = z.infer<typeof AgentReadyResponseSchema>;
export type AgentVersionResponse = z.infer<typeof AgentVersionResponseSchema>;
