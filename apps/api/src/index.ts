/**
 * Tillu Core API — Entry Point
 *
 * Starts the Express server with all middleware and routes.
 * Environment variables must be set before starting — see docs/ENV_SPEC.md
 */

import { createApp } from "./app.js";
import { createLogger } from "@tillu/logging";

const logger = createLogger({ service: "api" });

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);

async function main() {
  const app = createApp();

  app.listen(PORT, () => {
    logger.info("api.started", {
      port: PORT,
      env: process.env["NODE_ENV"] ?? "development",
    });
  });
}

main().catch((err: unknown) => {
  logger.error("api.startup_failed", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
