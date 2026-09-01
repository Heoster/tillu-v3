/**
 * LectureProgressSync
 *
 * Periodically syncs lecture playback position from BrowserController
 * to the cloud API (PUT /lectures/:id/progress).
 *
 * Also handles the offline queue:
 *   - When cloud API is unreachable, events are queued to disk
 *   - On reconnect, queued events are flushed
 *   - Duplicate events are idempotent (position updates overwrite)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";
import type { BrowserController } from "./browser-controller.js";

interface QueuedUpdate {
  lecture_id:   string;
  position_sec: number;
  duration_sec: number | null;
  completed:    boolean;
  recorded_at:  string;
}

export class LectureProgressSync {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private queue: QueuedUpdate[] = [];
  private accessToken: string | null = null;

  constructor(private readonly browser: BrowserController) {
    // Load existing queue from disk on startup
    this.loadQueue();
  }

  /** Set the Bearer token for cloud API calls */
  setToken(token: string): void {
    this.accessToken = token;
  }

  /** Start the sync loop */
  start(): void {
    if (this.intervalHandle) return;

    this.intervalHandle = setInterval(() => {
      void this.syncOnce();
    }, config.syncIntervalMs);

    console.log(`[ProgressSync] Started (interval: ${config.syncIntervalMs}ms)`);
  }

  /** Stop the sync loop */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /** One sync cycle: poll browser, push to cloud or queue */
  async syncOnce(): Promise<void> {
    const playback = await this.browser.pollPlaybackPosition();
    const current  = this.browser.getCurrentPlayback();

    if (!playback || !current) return;

    const update: QueuedUpdate = {
      lecture_id:   current.lectureId,
      position_sec: playback.positionSec,
      duration_sec: playback.durationSec,
      completed:    playback.completed,
      recorded_at:  new Date().toISOString(),
    };

    // Try to push to cloud
    const pushed = await this.pushToCloud(update);

    if (!pushed) {
      // Queue for later flush
      this.enqueue(update);
    } else {
      // Flush any previously queued items
      await this.flushQueue();
    }
  }

  /** Flush pending offline queue to cloud */
  async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const pending = [...this.queue];
    for (const update of pending) {
      const pushed = await this.pushToCloud(update);
      if (pushed) {
        this.queue = this.queue.filter((u) => u.recorded_at !== update.recorded_at);
      } else {
        break; // Cloud still unreachable — stop trying
      }
    }

    this.saveQueue();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async pushToCloud(update: QueuedUpdate): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const res = await fetch(
        `${config.cloudApiUrl}/lectures/${update.lecture_id}/progress`,
        {
          method: "PUT",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            position_sec: update.position_sec,
            duration_sec: update.duration_sec,
            completed:    update.completed,
          }),
          signal: AbortSignal.timeout(5000),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  private enqueue(update: QueuedUpdate): void {
    // Replace any existing entry for the same lecture (newer position wins)
    const idx = this.queue.findIndex((u) => u.lecture_id === update.lecture_id);
    if (idx >= 0) {
      this.queue[idx] = update;
    } else {
      this.queue.push(update);
    }
    this.saveQueue();
  }

  private saveQueue(): void {
    try {
      const dir = dirname(config.queuePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(config.queuePath, JSON.stringify(this.queue, null, 2));
    } catch (err) {
      console.error("[ProgressSync] Failed to save queue:", err);
    }
  }

  private loadQueue(): void {
    try {
      if (existsSync(config.queuePath)) {
        const raw = readFileSync(config.queuePath, "utf-8");
        this.queue = JSON.parse(raw) as QueuedUpdate[];
        if (this.queue.length > 0) {
          console.log(`[ProgressSync] Loaded ${this.queue.length} queued updates from disk`);
        }
      }
    } catch {
      this.queue = [];
    }
  }
}
