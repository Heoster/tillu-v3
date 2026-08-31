/**
 * @tillu/logging
 *
 * Structured logger for all Tillu services.
 *
 * Rules:
 * - Never use console.log in production code. Use this logger.
 * - Every log entry at info level or above must include request_id and trace_id.
 * - Never log: API keys, student answers, database connection strings, secrets.
 */

import pino from "pino";

const isProduction = process.env["NODE_ENV"] === "production";
const logLevel = process.env["LOG_LEVEL"] ?? "info";
const logFormat = process.env["LOG_FORMAT"] ?? (isProduction ? "json" : "pretty");

/**
 * Base logger. Use createLogger() in each service to add service context.
 */
export const baseLogger = pino({
  level: logLevel,
  ...(logFormat === "pretty"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, ignore: "pid,hostname" },
        },
      }
    : {}),
  base: {
    service: process.env["AGENT_NAME"] ?? "tillu",
    version: process.env["AGENT_VERSION"] ?? "unknown",
    env: process.env["NODE_ENV"] ?? "development",
  },
  redact: {
    // Never log these fields even if accidentally passed
    paths: [
      "*.api_key",
      "*.apiKey",
      "*.password",
      "*.secret",
      "*.token",
      "*.service_role_key",
      "*.supabase_key",
    ],
    censor: "[REDACTED]",
  },
});

/**
 * Create a child logger for a specific service or request.
 */
export function createLogger(context: {
  service: string;
  request_id?: string;
  trace_id?: string;
  [key: string]: string | undefined;
}) {
  return baseLogger.child(context);
}

export type Logger = ReturnType<typeof createLogger>;
