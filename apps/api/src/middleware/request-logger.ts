import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "@tillu/logging";

const logger = createLogger({ service: "api" });

// Extend Express Request to carry request_id and trace_id
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      traceId: string;
    }
  }
}

/**
 * Attaches a unique request_id and trace_id to every incoming request.
 * Logs request start and end with latency.
 * These IDs are included in all downstream logs and API errors.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.requestId = (req.headers["x-request-id"] as string | undefined) ?? uuidv4();
  req.traceId = (req.headers["x-trace-id"] as string | undefined) ?? uuidv4();

  const start = Date.now();

  res.on("finish", () => {
    logger.info("api.request", {
      request_id: req.requestId,
      trace_id: req.traceId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency_ms: Date.now() - start,
    });
  });

  next();
}
