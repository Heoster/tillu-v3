import type { Request, Response, NextFunction } from "express";
import { verifyUserToken } from "@tillu/auth";
import { TilluError } from "@tillu/utilities";

// Extend Request to carry authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

/**
 * Middleware that verifies the Supabase JWT in Authorization header.
 * Attaches req.user on success. Calls next(err) on failure.
 *
 * Apply to any route that requires authentication.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  verifyUserToken(req.headers["authorization"])
    .then((user) => {
      req.user = user;
      next();
    })
    .catch((err: unknown) => {
      next(err instanceof TilluError ? err : new Error(String(err)));
    });
}
