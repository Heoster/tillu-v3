import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getQuotaGuardian } from "@tillu/model-router";
import { getServiceClient } from "@tillu/database";

export const quotaRouter = Router();
quotaRouter.use(requireAuth);

/**
 * GET /quota/status
 * Current quota usage per provider and overall operating mode.
 */
quotaRouter.get("/status", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = getQuotaGuardian().getStatus();
    res.json(status);
  } catch (err) { next(err); }
});

/**
 * POST /quota/flush
 * Flush pending quota usage records to the database.
 * Called by n8n health-check workflow every 60 seconds.
 */
quotaRouter.post("/flush", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getServiceClient();
    await getQuotaGuardian().flushToDb(db);
    res.json({ flushed: true });
  } catch (err) { next(err); }
});
