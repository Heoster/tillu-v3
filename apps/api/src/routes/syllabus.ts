import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { SyllabusService } from "../services/syllabus.service.js";

export const syllabusRouter = Router();
syllabusRouter.use(requireAuth);

const syllabusService = new SyllabusService();

/** GET /syllabus — full CBSE Class 12 overview (subjects + chapter counts) */
syllabusRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await syllabusService.getSyllabusOverview();
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

/** GET /syllabus/subjects — list all subjects */
syllabusRouter.get("/subjects", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await syllabusService.getSubjects();
    res.json(subjects);
  } catch (err) {
    next(err);
  }
});

/** GET /syllabus/chapters/:subjectId */
syllabusRouter.get("/chapters/:subjectId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await syllabusService.getChapters(req.params["subjectId"] ?? "");
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /syllabus/concepts/:chapterId */
syllabusRouter.get("/concepts/:chapterId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await syllabusService.getConcepts(req.params["chapterId"] ?? "");
    res.json(result);
  } catch (err) {
    next(err);
  }
});
