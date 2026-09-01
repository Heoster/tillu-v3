/**
 * EmergencyStop
 *
 * INV-006: The local agent must ALWAYS be stoppable.
 *
 * A global kill-switch that:
 *   1. Sets a flag in-memory (immediate effect)
 *   2. Closes any open Chromium browser
 *   3. Cancels pending sync tasks
 *   4. Writes a stop marker to disk so restart doesn't auto-resume
 *
 * Can be triggered by:
 *   - POST /stop (API endpoint)
 *   - SIGTERM / SIGINT signals
 *   - DomainGuard violation
 *   - Any unhandled error in the browser controller
 */

import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

const STOP_MARKER_PATH = join(config.queuePath, "../.stopped");

type StopReason = "manual" | "domain_violation" | "error" | "signal";

export class EmergencyStop {
  private static stopped    = false;
  private static reason: StopReason | null = null;
  private static stopCallbacks: Array<() => Promise<void>> = [];

  /**
   * Register a callback to be called on emergency stop.
   * Use this to close browsers, cancel timers, etc.
   */
  static onStop(cb: () => Promise<void>): void {
    EmergencyStop.stopCallbacks.push(cb);
  }

  /**
   * Trigger the emergency stop.
   * Idempotent — calling multiple times is safe.
   *
   * INV-006: This must always succeed. Never throw.
   */
  static async trigger(reason: StopReason = "manual"): Promise<void> {
    if (EmergencyStop.stopped) return;

    EmergencyStop.stopped = true;
    EmergencyStop.reason  = reason;

    console.error(`[LocalAgent] EMERGENCY STOP triggered. Reason: ${reason}`);

    // Write stop marker so process knows not to auto-resume on restart
    try {
      writeFileSync(STOP_MARKER_PATH, JSON.stringify({
        stopped_at: new Date().toISOString(),
        reason,
      }));
    } catch {
      // Best-effort write — don't let this prevent the stop
    }

    // Run all registered cleanup callbacks
    for (const cb of EmergencyStop.stopCallbacks) {
      try {
        await cb();
      } catch (err) {
        console.error("[LocalAgent] Stop callback error (ignored):", err);
      }
    }
  }

  static isStopped(): boolean {
    return EmergencyStop.stopped;
  }

  static getReason(): StopReason | null {
    return EmergencyStop.reason;
  }

  /** Check if a manual stop marker exists from a previous run */
  static wasManuallyStoppedBefore(): boolean {
    return existsSync(STOP_MARKER_PATH);
  }

  /** Clear the stop marker (e.g. after user explicitly re-enables the agent) */
  static clearStopMarker(): void {
    try {
      if (existsSync(STOP_MARKER_PATH)) {
        const { unlinkSync } = require("node:fs") as typeof import("node:fs");
        unlinkSync(STOP_MARKER_PATH);
      }
    } catch { /* best-effort */ }
    EmergencyStop.stopped = false;
    EmergencyStop.reason  = null;
  }
}
