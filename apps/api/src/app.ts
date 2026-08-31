import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import { requestLogger } from "./middleware/request-logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";

import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { syllabusRouter } from "./routes/syllabus.js";
import { sessionsRouter } from "./routes/sessions.js";
import { masteryRouter } from "./routes/mastery.js";
import { formulaRouter } from "./routes/formula.js";
import { revisionRouter } from "./routes/revision.js";
import { sentinelRouter } from "./routes/sentinel.js";
import { quotaRouter } from "./routes/quota.js";

/**
 * Creates and configures the Express application.
 * Separated from index.ts so tests can import without starting the server.
 */
export function createApp(): express.Application {
  const app = express();

  // ── Security headers
  app.use(helmet());

  // ── CORS
  const allowedOrigins = (process.env["CORS_ORIGINS"] ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, agents)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    })
  );

  // ── Body parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // ── Rate limiting
  const windowMs = parseInt(process.env["RATE_LIMIT_WINDOW_MS"] ?? "60000", 10);
  const maxRequests = parseInt(process.env["RATE_LIMIT_MAX"] ?? "100", 10);

  app.use(
    rateLimit({
      windowMs,
      max: maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please wait before trying again.",
        },
      },
    })
  );

  // ── Request logging (attaches request_id to every request)
  app.use(requestLogger);

  // ── Routes
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/profile", profileRouter);
  app.use("/syllabus", syllabusRouter);
  app.use("/sessions", sessionsRouter);
  app.use("/mastery", masteryRouter);
  app.use("/formulas", formulaRouter);
  app.use("/revision", revisionRouter);
  app.use("/sentinel", sentinelRouter);
  app.use("/quota", quotaRouter);

  // ── 404
  app.use(notFound);

  // ── Error handler (must be last)
  app.use(errorHandler);

  return app;
}
