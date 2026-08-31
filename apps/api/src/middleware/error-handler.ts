import type { Request, Response, NextFunction } from "express";
import { TilluError, toApiError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";

const logger = createLogger({ service: "api" });

/**
 * Central error handler.
 * Converts all errors into consistent API error responses.
 * Never exposes raw stack traces or internal error details to the client.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const request_id = req.requestId ?? "unknown";

  if (err instanceof TilluError) {
    // Log at warn level for expected errors, error level for unexpected
    const logFn = err.recoverable ? logger.warn.bind(logger) : logger.error.bind(logger);
    logFn("api.error", {
      request_id,
      trace_id: req.traceId,
      code: err.code,
      message: err.message,
      recoverable: err.recoverable,
      context: err.context,
    });

    const status = statusFromCode(err.code);
    res.status(status).json(toApiError(err, request_id));
    return;
  }

  // Unknown error — log full details internally, return generic message externally
  logger.error("api.unhandled_error", {
    request_id,
    trace_id: req.traceId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json(toApiError(err, request_id));
}

function statusFromCode(code: string): number {
  if (code === "VALIDATION_ERROR") return 400;
  if (code === "AUTHORIZATION_ERROR") return 401;
  if (code === "NOT_FOUND") return 404;
  if (code === "CONFLICT") return 409;
  if (code === "RATE_LIMIT_EXCEEDED") return 429;
  if (code === "AI_UNAVAILABLE") return 503;
  return 500;
}
