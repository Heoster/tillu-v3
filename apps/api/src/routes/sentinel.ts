import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getSentinelService } from "../lib/sentinel.js";

export const sentinelRouter = Router();
sentinelRouter.use(requireAuth);

/**
 * GET /sentinel/dashboard
 * Full system health dashboard — agents, overall score, incidents.
 */
sentinelRouter.get("/dashboard", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await getSentinelService().getDashboard();
    res.json(dashboard);
  } catch (err) { next(err); }
});

/**
 * GET /sentinel/agents
 * List all registered agents with current health status.
 */
sentinelRouter.get("/agents", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await getSentinelService().getDashboard();
    res.json(dashboard.agents);
  } catch (err) { next(err); }
});

/**
 * POST /sentinel/poll
 * Trigger an immediate health poll of all agents.
 * Used by n8n scheduled workflow.
 */
sentinelRouter.post("/poll", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await getSentinelService().pollAllAgents();
    res.json({ polled: results.length, results });
  } catch (err) { next(err); }
});

/**
 * POST /sentinel/test/:agentName
 * Run synthetic test on a specific agent.
 */
sentinelRouter.post("/test/:agentName", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getSentinelService().runSyntheticTest(req.params["agentName"]!);
    res.status(result.pass ? 200 : 500).json(result);
  } catch (err) { next(err); }
});

/**
 * POST /sentinel/register
 * Register an agent in the registry.
 * Body: { name, version, endpoint, capabilities?, priority? }
 */
sentinelRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getSentinelService().registerAgent(req.body as {
      name: string;
      version: string;
      endpoint: string;
      capabilities?: string[];
      priority?: number;
    });
    res.status(201).json({ registered: true });
  } catch (err) { next(err); }
});
