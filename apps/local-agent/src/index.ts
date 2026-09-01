/**
 * Tillu Local Agent
 *
 * HTTP server exposing control endpoints + manages Playwright Chromium.
 *
 * INV-006: Emergency stop is ALWAYS available via POST /stop.
 *
 * Endpoints:
 *   GET  /health          → liveness
 *   GET  /status          → current state (enabled, browser open, playback)
 *   POST /launch          → launch Chromium (if not already open)
 *   POST /navigate        → navigate to a lecture URL (domain-guarded)
 *   POST /stop            → EMERGENCY STOP (INV-006)
 *   POST /enable          → clear stop marker and re-enable agent
 *   GET  /playback        → current playback position
 *   POST /sync            → manual sync trigger
 *   PUT  /token           → set Bearer token for cloud API sync
 *
 * All mutation endpoints require X-Agent-Secret header.
 */

import express from "express";
import { config } from "./config.js";
import { DomainGuard } from "./domain-guard.js";
import { EmergencyStop } from "./emergency-stop.js";
import { BrowserController } from "./browser-controller.js";
import { LectureProgressSync } from "./progress-sync.js";

// ── Bootstrap ──────────────────────────────────────────────────────────────

const guard   = new DomainGuard();
const browser = new BrowserController(guard);
const sync    = new LectureProgressSync(browser);

// ── Auth middleware ────────────────────────────────────────────────────────

function requireSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const secret = req.headers["x-agent-secret"];
  if (secret !== config.agentSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ── Express app ────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

/** GET /health — liveness (no auth required) */
app.get("/health", (_req, res) => {
  res.json({
    status:    EmergencyStop.isStopped() ? "stopped" : "ok",
    stopped:   EmergencyStop.isStopped(),
    stop_reason: EmergencyStop.getReason(),
    browser_open: browser.isOpen(),
    timestamp:   new Date().toISOString(),
  });
});

/** GET /status — full agent status */
app.get("/status", requireSecret, (_req, res) => {
  res.json({
    enabled:      !EmergencyStop.isStopped(),
    browser_open:  browser.isOpen(),
    playback:      browser.getCurrentPlayback(),
    allowed_domains: guard.getAllowedDomains(),
    timestamp:     new Date().toISOString(),
  });
});

/** POST /launch — launch Chromium */
app.post("/launch", requireSecret, async (_req, res, next) => {
  try {
    await browser.launch();
    sync.start();
    res.json({ launched: true });
  } catch (err) { next(err); }
});

/** POST /navigate — navigate to lecture URL */
app.post("/navigate", requireSecret, async (req, res, next) => {
  try {
    const { url, lecture_id } = req.body as { url?: string; lecture_id?: string };
    if (!url || !lecture_id) {
      res.status(400).json({ error: "url and lecture_id required" });
      return;
    }
    await browser.navigateTo(url, lecture_id);
    res.json({ navigated: true, url });
  } catch (err) { next(err); }
});

/**
 * POST /stop — EMERGENCY STOP
 * INV-006: This endpoint must ALWAYS work, even if other parts of the agent
 * are in an error state. No auth check is intentionally omitted here —
 * the secret is still checked for security, but the stop handler itself
 * is wrapped in a global try/catch to ensure it completes.
 */
app.post("/stop", requireSecret, async (_req, res) => {
  try {
    await EmergencyStop.trigger("manual");
    sync.stop();
    res.json({
      stopped:    true,
      reason:     "manual",
      timestamp:  new Date().toISOString(),
    });
  } catch (err) {
    // Should never reach here — but if it does, still report success
    // because the stopped flag was set before any error could occur
    console.error("[LocalAgent] Stop cleanup error:", err);
    res.json({ stopped: true, reason: "manual", cleanup_error: String(err) });
  }
});

/** POST /enable — clear stop marker and re-enable the agent */
app.post("/enable", requireSecret, (_req, res) => {
  EmergencyStop.clearStopMarker();
  res.json({ enabled: true });
});

/** GET /playback — current playback position */
app.get("/playback", requireSecret, async (_req, res, next) => {
  try {
    const position = await browser.pollPlaybackPosition();
    const current  = browser.getCurrentPlayback();
    res.json({ playback: current, position });
  } catch (err) { next(err); }
});

/** POST /sync — manually trigger one sync cycle */
app.post("/sync", requireSecret, async (_req, res, next) => {
  try {
    await sync.syncOnce();
    res.json({ synced: true });
  } catch (err) { next(err); }
});

/** PUT /token — set the Bearer token for cloud API calls */
app.put("/token", requireSecret, (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "token required" });
    return;
  }
  sync.setToken(token);
  res.json({ token_set: true });
});

/** Error handler */
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[LocalAgent] Error:", err);
  res.status(500).json({
    error: err instanceof Error ? err.message : String(err),
  });
});

// ── Startup ────────────────────────────────────────────────────────────────

// Handle OS signals — always trigger EmergencyStop
process.on("SIGTERM", () => { void EmergencyStop.trigger("signal").then(() => process.exit(0)); });
process.on("SIGINT",  () => { void EmergencyStop.trigger("signal").then(() => process.exit(0)); });

// Check if previously stopped
if (EmergencyStop.wasManuallyStoppedBefore()) {
  console.warn("[LocalAgent] Previously stopped manually. Waiting for POST /enable before resuming.");
}

app.listen(config.port, () => {
  console.log(`[LocalAgent] Listening on port ${config.port}`);
  console.log(`[LocalAgent] Allowed domains: ${config.allowedDomains.join(", ")}`);
  console.log(`[LocalAgent] Cloud API: ${config.cloudApiUrl}`);
});

export { app };
