import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getLectureService } from "../lib/lecture.js";
import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";

export const lecturesRouter = Router();
lecturesRouter.use(requireAuth);

async function resolveStudentId(userId: string): Promise<string> {
  const db = getServiceClient();
  const { data } = await db.from("student_profiles").select("id").eq("user_id", userId).single();
  if (!data) throw new TilluError("Student profile not found", "NOT_FOUND", false);
  return data.id;
}

/**
 * GET /lectures/chapters/:chapterId
 * List approved playlists + lectures for a chapter.
 */
lecturesRouter.get("/chapters/:chapterId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getLectureService().getPlaylists(req.params["chapterId"]!);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * GET /lectures/chapters/:chapterId/last-watched
 * Get last-watched lecture for a chapter (for "continue where you left off").
 */
lecturesRouter.get("/chapters/:chapterId/last-watched", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const result    = await getLectureService().getLastWatched(studentId, req.params["chapterId"]!);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * GET /lectures/chapters/:chapterId/progress
 * Lecture completion progress for a chapter (total, completed, in_progress, pct).
 */
lecturesRouter.get("/chapters/:chapterId/progress", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const progress  = await getLectureService().getChapterLectureProgress(studentId, req.params["chapterId"]!);
    res.json(progress);
  } catch (err) { next(err); }
});

/**
 * GET /lectures/playlists/:playlistId
 * Playlist details with per-lecture progress for the student.
 */
lecturesRouter.get("/playlists/:playlistId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const result    = await getLectureService().getPlaylistWithProgress(req.params["playlistId"]!, studentId);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * GET /lectures/:lectureId/resume
 * Last watched position for a lecture (for resume).
 */
lecturesRouter.get("/:lectureId/resume", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const position  = await getLectureService().getResumePosition(studentId, req.params["lectureId"]!);
    if (!position) return res.status(204).json(null);
    return res.json(position);
  } catch (err) { next(err); }
});

/**
 * PUT /lectures/:lectureId/progress
 * Update playback position (called frequently during playback).
 * Body: { position_sec, duration_sec?, completed? }
 */
lecturesRouter.put("/:lectureId/progress", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const result    = await getLectureService().updateProgress(
      studentId,
      req.params["lectureId"]!,
      req.body as Record<string, unknown>
    );
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * POST /lectures/:lectureId/complete
 * Mark lecture as complete. Triggers LECTURE_COMPLETED + recall questions.
 */
lecturesRouter.post("/:lectureId/complete", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const result    = await getLectureService().markComplete(studentId, req.params["lectureId"]!);
    res.json(result);
  } catch (err) { next(err); }
});
