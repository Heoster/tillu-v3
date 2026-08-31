import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getRevisionService } from "../lib/revision.js";
import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";

export const revisionRouter = Router();
revisionRouter.use(requireAuth);

async function resolveStudentId(userId: string): Promise<string> {
  const db = getServiceClient();
  const { data } = await db
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (!data) throw new TilluError("Student profile not found", "NOT_FOUND", false);
  return data.id;
}

/**
 * GET /revision/dashboard
 * Combined view: due_now, coming_up, radar, memory_health
 */
revisionRouter.get("/dashboard", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const dashboard = await getRevisionService().getDashboard(studentId);
    res.json(dashboard);
  } catch (err) { next(err); }
});

/**
 * GET /revision/due
 * Items overdue for review (next_review_at <= now), ordered by priority.
 * Query: ?limit=20
 */
revisionRouter.get("/due", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const limit = parseInt(String(req.query["limit"] ?? "20"), 10);
    const due = await getRevisionService().getDueRevisions(studentId, limit);
    res.json(due);
  } catch (err) { next(err); }
});

/**
 * GET /revision/upcoming
 * Items due within the next N hours.
 * Query: ?hours=24&limit=20
 */
revisionRouter.get("/upcoming", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const hours = parseInt(String(req.query["hours"] ?? "24"), 10);
    const limit = parseInt(String(req.query["limit"] ?? "20"), 10);
    const upcoming = await getRevisionService().getUpcomingRevisions(studentId, hours, limit);
    res.json(upcoming);
  } catch (err) { next(err); }
});

/**
 * GET /revision/radar
 * Top concepts by forgetting risk (priority DESC).
 * Query: ?limit=10
 */
revisionRouter.get("/radar", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const limit = parseInt(String(req.query["limit"] ?? "10"), 10);
    const radar = await getRevisionService().getForgettingRadar(studentId, limit);
    res.json(radar);
  } catch (err) { next(err); }
});

/**
 * POST /revision/schedule
 * Schedule a new revision item for a concept.
 * Body: { concept_id, revision_type?, source_event? }
 */
revisionRouter.post("/schedule", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const item = await getRevisionService().scheduleRevision(
      studentId,
      req.body as Record<string, unknown>
    );
    res.status(201).json(item);
  } catch (err) { next(err); }
});

/**
 * POST /revision/:id/complete
 * Record outcome of a revision session and compute next interval.
 * Body: { outcome: 'success'|'failure'|'partial', recall_quality: 0–5, notes? }
 */
revisionRouter.post("/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const result = await getRevisionService().completeRevision(studentId, {
      revision_item_id: req.params["id"]!,
      ...(req.body as Record<string, unknown>),
    });
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * POST /revision/scan
 * Manually trigger a due-item scan and emit REVISION_DUE events.
 * Used by n8n morning workflow or manual testing.
 */
revisionRouter.post("/scan", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const count = await getRevisionService().scanAndEmitDue(studentId);
    res.json({ emitted: count });
  } catch (err) { next(err); }
});
