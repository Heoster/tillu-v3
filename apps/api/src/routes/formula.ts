import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { FormulaService } from "../services/formula.service.js";
import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";

export const formulaRouter = Router();
formulaRouter.use(requireAuth);

const formulaService = new FormulaService();

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

/** GET /formulas/daily — today's recall list */
formulaRouter.get("/daily", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const subjectId = typeof req.query["subject_id"] === "string" ? req.query["subject_id"] : undefined;
    const limit = parseInt(String(req.query["limit"] ?? "10"), 10);
    const list = await formulaService.getDailyRecallList(studentId, subjectId, limit);
    res.json(list);
  } catch (err) { next(err); }
});

/** GET /formulas/stats — recall stats for the student */
formulaRouter.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const stats = await formulaService.getRecallStats(studentId);
    res.json(stats);
  } catch (err) { next(err); }
});

/** GET /formulas/subject/:subjectId — all formulas for a subject */
formulaRouter.get("/subject/:subjectId", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const formulas = await formulaService.getFormulasBySubject(_req.params["subjectId"]!);
    res.json(formulas);
  } catch (err) { next(err); }
});

/** GET /formulas/:id — single formula */
formulaRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const formula = await formulaService.getFormula(req.params["id"]!);
    res.json(formula);
  } catch (err) { next(err); }
});

/** GET /formulas/:id/history — recall history */
formulaRouter.get("/:id/history", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const history = await formulaService.getRecallHistory(studentId, req.params["id"]!);
    res.json(history);
  } catch (err) { next(err); }
});

/**
 * POST /formulas/:id/recall
 * Body: { outcome: 'recalled' | 'partial' | 'failed', student_answer?: string }
 */
formulaRouter.post("/:id/recall", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const result = await formulaService.submitRecall(studentId, {
      formula_id: req.params["id"]!,
      ...(req.body as Record<string, unknown>),
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
});
