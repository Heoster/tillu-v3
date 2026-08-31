import { Router, type Request, type Response, type NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { requireAuth } from "../middleware/require-auth.js";
import { getServiceClient } from "@tillu/database";

export const authRouter = Router();
const authService = new AuthService();

/**
 * POST /auth/register
 * Body: { name, email, password }
 */
authRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.register(req.body as Record<string, unknown>);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 */
authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body as Record<string, unknown>);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout
 * Header: Authorization: Bearer <token>
 */
authRouter.post("/logout", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers["authorization"]?.slice(7) ?? "";
    await authService.logout(token);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Returns the authenticated user + their student profile.
 * Header: Authorization: Bearer <token>
 */
authRouter.get("/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getServiceClient();
    const { data: profile, error } = await db
      .from("student_profiles")
      .select("*")
      .eq("user_id", req.user!.id)
      .single();

    if (error || !profile) {
      // New user who hasn't completed onboarding yet
      return res.json({ user: req.user, profile: null });
    }

    return res.json({ user: req.user, profile });
  } catch (err) {
    next(err);
  }
});
