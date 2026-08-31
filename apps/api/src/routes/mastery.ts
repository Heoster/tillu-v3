import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getMasteryService, MasteryService } from "../services/mastery.service.js";
import { getMasteryService as getMasterySingleton } from "../lib/mastery.js";
import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";

export const masteryRouter = Router();
masteryRouter.use(requireAuth);

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
 * GET /mastery/:conceptId
 * Returns mastery breakdown for one concept.
 */
masteryRouter.get("/:conceptId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const mastery = await getMasterySingleton().getMastery(studentId, req.params["conceptId"]!);
    if (!mastery) return res.status(204).json(null);
    return res.json(mastery);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /mastery/chapter/:chapterId
 * Returns mastery for every concept in a chapter.
 */
masteryRouter.get("/chapter/:chapterId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const masteryMap = await getMasterySingleton().getMasteryForChapter(
      studentId,
      req.params["chapterId"]!
    );
    // Convert Map to plain object for JSON serialisation
    res.json(Object.fromEntries(masteryMap));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /mastery/radar
 * Returns concepts at highest forgetting risk for this student.
 */
masteryRouter.get("/radar", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const limit = parseInt(String(req.query["limit"] ?? "10"), 10);
    const radar = await getMasterySingleton().getForgettingRadar(studentId, limit);
    res.json(radar);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /mastery/evidence
 * Add a piece of study evidence and recalculate mastery.
 *
 * INV-001: This is the ONLY way mastery changes — no AI agent bypasses this route.
 * Body: { concept_id, evidence_type, score, max_score?, is_correct, source_agent? }
 */
masteryRouter.post("/evidence", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // INV-001 guard — reject payloads that try to set mastery_score directly
    MasteryService.assertNotAiDirectWrite(req.body as Record<string, unknown>);

    const studentId = await resolveStudentId(req.user!.id);
    const breakdown = await getMasterySingleton().addEvidence(
      studentId,
      req.body as Record<string, unknown>
    );
    res.json(breakdown);
  } catch (err) {
    next(err);
  }
});
