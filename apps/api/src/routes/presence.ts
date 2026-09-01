import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getPresenceService } from "../lib/presence.js";
import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";

export const presenceRouter = Router();
presenceRouter.use(requireAuth);

async function resolveStudentId(userId: string): Promise<string> {
  const db = getServiceClient();
  const { data } = await db.from("student_profiles").select("id").eq("user_id", userId).single();
  if (!data) throw new TilluError("Student profile not found", "NOT_FOUND", false);
  return data.id;
}

/**
 * GET /presence
 * Current presence state for the authenticated student.
 */
presenceRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const presence  = await getPresenceService().getPresence(studentId);
    res.json(presence);
  } catch (err) { next(err); }
});

/**
 * PUT /presence/signal
 * Process a new presence signal.
 * Body: { signal_type, metadata? }
 *
 * Called by: web app (on page load), local agent (heartbeat), study service.
 */
presenceRouter.put("/signal", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const presence  = await getPresenceService().processSignal(
      studentId,
      req.body as Record<string, unknown>
    );
    res.json(presence);
  } catch (err) { next(err); }
});

/**
 * POST /presence/override
 * Student manually sets their presence state.
 * Body: { state, reason? }
 * INV-009: confidence is still capped at 0.95 — cannot be "certain".
 */
presenceRouter.post("/override", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const presence  = await getPresenceService().overridePresence(
      studentId,
      req.body as Record<string, unknown>
    );
    res.json(presence);
  } catch (err) { next(err); }
});

/**
 * POST /presence/decay
 * Trigger decay scan for the student (normally called by n8n every 5 min).
 */
presenceRouter.post("/decay", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    await getPresenceService().decayStalePresence(studentId);
    res.json({ success: true });
  } catch (err) { next(err); }
});
