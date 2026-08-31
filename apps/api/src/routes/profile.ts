import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { ProfileService } from "../services/profile.service.js";
import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";

export const profileRouter = Router();
profileRouter.use(requireAuth);

const profileService = new ProfileService();

/** GET /profile — get authenticated student's full profile */
profileRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileService.getProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

/** POST /profile — create / update profile */
profileRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileService.upsertProfile(req.user!.id, req.body as Record<string, unknown>);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

/** PUT /profile — update profile fields */
profileRouter.put("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileService.upsertProfile(req.user!.id, req.body as Record<string, unknown>);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

/** PUT /profile/subjects — set selected subjects */
profileRouter.put("/subjects", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get student profile id from user_id
    const db = getServiceClient();
    const { data: profile } = await db
      .from("student_profiles")
      .select("id")
      .eq("user_id", req.user!.id)
      .single();

    if (!profile) {
      throw new TilluError("Create your profile first", "NOT_FOUND", false);
    }

    const result = await profileService.updateSubjects(profile.id, req.body as Record<string, unknown>);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** PUT /profile/availability — set availability windows */
profileRouter.put("/availability", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getServiceClient();
    const { data: profile } = await db
      .from("student_profiles")
      .select("id")
      .eq("user_id", req.user!.id)
      .single();

    if (!profile) {
      throw new TilluError("Create your profile first", "NOT_FOUND", false);
    }

    const result = await profileService.updateAvailability(profile.id, req.body as Record<string, unknown>);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
