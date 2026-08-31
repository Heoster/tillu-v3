import { Router } from "express";
import { getServiceClient } from "@tillu/database";

export const healthRouter = Router();

/**
 * GET /health
 * System liveness check — returns 200 when the API is running and DB is reachable.
 */
healthRouter.get("/", async (_req, res) => {
  const checks: Record<string, "ok" | "error"> = {
    api: "ok",
    database: "ok",
  };

  try {
    const db = getServiceClient();
    // Lightweight DB check — query a system table
    const { error } = await db.from("agents").select("id").limit(1);
    if (error) checks["database"] = "error";
  } catch {
    checks["database"] = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    version: process.env["npm_package_version"] ?? "0.1.0",
    timestamp: new Date().toISOString(),
    checks,
  });
});
