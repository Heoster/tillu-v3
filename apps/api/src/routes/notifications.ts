import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

async function resolveStudentId(userId: string): Promise<string> {
  const db = getServiceClient();
  const { data } = await db.from("student_profiles").select("id").eq("user_id", userId).single();
  if (!data) throw new TilluError("Student profile not found", "NOT_FOUND", false);
  return data.id;
}

notificationsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const limit = Math.min(Math.max(Number(req.query["limit"] ?? 20) || 20, 1), 100);
    const db = getServiceClient();
    const { data, error } = await db.from("notifications").select("id, notification_type, priority, title, body, status, created_at, sent_at, read_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
    res.json(data ?? []);
  } catch (err) { next(err); }
});

notificationsRouter.patch("/:id/read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = await resolveStudentId(req.user!.id);
    const db = getServiceClient();
    const { data, error } = await db.from("notifications").update({ status: "read", read_at: new Date().toISOString() }).eq("id", req.params["id"]!).eq("student_id", studentId).select("id, status, read_at").single();
    if (error || !data) throw new TilluError("Notification not found", "NOT_FOUND", false);
    res.json(data);
  } catch (err) { next(err); }
});
