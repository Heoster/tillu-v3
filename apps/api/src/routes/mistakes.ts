import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getMistakeService } from "../lib/mistake.js";
import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";

export const mistakesRouter = Router();
mistakesRouter.use(requireAuth);

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
 * POST /mistakes
 * Record a new mistake after a wrong answer.
 * Body: { concept_id, error_type, severity?, cause?, question_id?, source? }
 */
mistakesRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const result = await getMistakeService().createMistake(
      studentId,
      req.body as Record<string, unknown>
    );
    res.status(201).json(result);
  } catch (err) { next(err); }
});

/**
 * GET /mistakes
 * List mistakes for the student.
 * Query: ?concept_id=&error_type=&resolution_status=&limit=50
 */
mistakesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const mistakes  = await getMistakeService().getMistakes(studentId, {
      concept_id:        typeof req.query["concept_id"]        === "string" ? req.query["concept_id"]        : undefined,
      error_type:        typeof req.query["error_type"]        === "string" ? req.query["error_type"]        : undefined,
      resolution_status: typeof req.query["resolution_status"] === "string" ? req.query["resolution_status"] : undefined,
      limit:             req.query["limit"] ? parseInt(String(req.query["limit"]), 10) : undefined,
    });
    res.json(mistakes);
  } catch (err) { next(err); }
});

/**
 * GET /mistakes/bank
 * Mistake Bank summary — grouped by concept with top error type.
 */
mistakesRouter.get("/bank", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const summary   = await getMistakeService().getMistakeBankSummary(studentId);
    res.json(summary);
  } catch (err) { next(err); }
});

/**
 * GET /mistakes/patterns
 * Active mistake patterns (3+ same concept + error_type in 30 days).
 */
mistakesRouter.get("/patterns", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const patterns  = await getMistakeService().getMistakePatterns(studentId);
    res.json(patterns);
  } catch (err) { next(err); }
});

/**
 * POST /mistakes/repair/:patternId
 * Start a repair session for a mistake pattern.
 * Returns a structured repair plan.
 */
mistakesRouter.post("/repair/:patternId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const plan      = await getMistakeService().startRepairSession(
      studentId,
      req.params["patternId"]!
    );
    res.json(plan);
  } catch (err) { next(err); }
});

/**
 * PATCH /mistakes/:id/resolve
 * Update resolution status of a mistake.
 * Body: { resolution_status: 'in_repair' | 'resolved' }
 */
mistakesRouter.patch("/:id/resolve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const result    = await getMistakeService().resolveMistake(studentId, {
      mistake_id:        req.params["id"]!,
      ...(req.body as Record<string, unknown>),
    });
    res.json(result);
  } catch (err) { next(err); }
});
