import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { StudyService } from "../services/study.service.js";
import { getEventBus } from "../lib/event-bus.js";
import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

function getStudyService() {
  return new StudyService(getEventBus());
}

/** Resolve student_id from user_id once per request */
async function resolveStudentId(userId: string): Promise<string> {
  const db = getServiceClient();
  const { data } = await db
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!data) {
    throw new TilluError(
      "Student profile not found. Please complete onboarding first.",
      "NOT_FOUND",
      false
    );
  }
  return data.id;
}

/**
 * POST /sessions/start
 * Body: { subject_id?, chapter_id?, concept_id?, activity_type?, planned_duration_min? }
 */
sessionsRouter.post("/start", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const session = await getStudyService().startSession(studentId, req.body as Record<string, unknown>);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sessions/:id/pause
 */
sessionsRouter.post("/:id/pause", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const session = await getStudyService().pauseSession(req.params["id"]!, studentId);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sessions/:id/resume
 */
sessionsRouter.post("/:id/resume", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const session = await getStudyService().resumeSession(req.params["id"]!, studentId);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sessions/:id/end
 * Body: { outcome?: 'completed' | 'abandoned' }
 */
sessionsRouter.post("/:id/end", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const body = req.body as { outcome?: "completed" | "abandoned" };
    const session = await getStudyService().endSession(
      req.params["id"]!,
      studentId,
      body.outcome ?? "completed"
    );
    res.json(session);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sessions
 * Query: ?limit=30&status=completed
 */
sessionsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const limit = parseInt(String(req.query["limit"] ?? "30"), 10);
    const status = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
    const sessions = await getStudyService().listSessions(studentId, { limit, status });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sessions/today
 */
sessionsRouter.get("/today", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const summary = await getStudyService().getTodaySummary(studentId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sessions/:id
 */
sessionsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const session = await getStudyService().getSession(req.params["id"]!, studentId);
    res.json(session);
  } catch (err) {
    next(err);
  }
});
