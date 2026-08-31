import express from "express";
import { v4 as uuidv4 } from "uuid";
import { AgentRequestSchema } from "@tillu/schemas";
import { toApiError } from "@tillu/utilities";
import type { AgentBase } from "./agent-base.js";

/**
 * Creates a standard Express server for a Tillu agent.
 * Mounts all required contract endpoints.
 *
 * Usage:
 *   const app = createAgentServer(myAgent);
 *   app.listen(3100);
 */
export function createAgentServer(agent: AgentBase): express.Application {
  const app = express();
  app.use(express.json());

  // --- Contract endpoints ---

  /** GET /health → liveness check */
  app.get("/health", (_req, res) => {
    res.json(agent.getHealthResponse());
  });

  /** GET /ready → readiness check */
  app.get("/ready", (_req, res) => {
    const result = agent.isReady();
    res.status(result.ready ? 200 : 503).json(result);
  });

  /** GET /version → version info */
  app.get("/version", (_req, res) => {
    res.json(agent.getVersionResponse());
  });

  /** POST /test → synthetic test for Sentinel */
  app.post("/test", async (_req, res) => {
    try {
      const result = await agent.runSyntheticTest();
      res.status(result.pass ? 200 : 500).json(result);
    } catch (err) {
      res.status(500).json({ pass: false, details: String(err) });
    }
  });

  /** POST /run → main agent execution */
  app.post("/run", async (req, res) => {
    const request_id = uuidv4();
    const parsed = AgentRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json(
        toApiError(
          new Error("Invalid request envelope: " + JSON.stringify(parsed.error.flatten())),
          request_id
        )
      );
    }

    try {
      const response = await agent.handle(parsed.data);
      return res.json(response);
    } catch (err) {
      return res.status(500).json(toApiError(err, request_id));
    }
  });

  return app;
}
