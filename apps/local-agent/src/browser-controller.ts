/**
 * BrowserController
 *
 * Manages a single Playwright Chromium browser instance.
 * ALL navigation goes through DomainGuard — any attempt to navigate outside
 * the approved domain list triggers EmergencyStop.
 *
 * Responsibilities:
 *   - Launch / close Chromium
 *   - Navigate to approved lecture URLs
 *   - Track playback position via page evaluation
 *   - Report progress back to LectureProgressSync
 *
 * Security rules:
 *   - Domain allowlist enforced before every navigation
 *   - No arbitrary script injection
 *   - No file system access from browser context
 *   - No storing or transmitting browser session cookies externally
 */

import { chromium, type Browser, type Page } from "playwright";
import { DomainGuard } from "./domain-guard.js";
import { EmergencyStop } from "./emergency-stop.js";

interface PlaybackState {
  lectureId:    string;
  url:          string;
  positionSec:  number;
  durationSec:  number | null;
  completed:    boolean;
  lastPolledAt: Date;
}

export class BrowserController {
  private browser:  Browser | null = null;
  private page:     Page    | null = null;
  private readonly guard: DomainGuard;
  private playback: PlaybackState | null = null;

  constructor(guard?: DomainGuard) {
    this.guard = guard ?? new DomainGuard();

    // Register cleanup with EmergencyStop
    EmergencyStop.onStop(async () => {
      await this.close();
    });
  }

  /**
   * Launch the Chromium browser (headless=false so student can see it).
   * Does nothing if browser is already open.
   */
  async launch(): Promise<void> {
    if (EmergencyStop.isStopped()) {
      throw new Error("LocalAgent is stopped. Call /enable to restart.");
    }
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        // Block third-party ads/tracking not related to lecture
        "--disable-extensions",
      ],
    });

    this.page = await this.browser.newPage();

    // Block navigation to non-approved domains at the network level
    await this.page.route("**/*", async (route) => {
      const url = route.request().url();
      const resourceType = route.request().resourceType();

      // Allow all resources within approved domains
      if (this.guard.isAllowed(url)) {
        await route.continue();
        return;
      }

      // Allow basic media/fonts/scripts needed by YouTube
      if (["media", "image", "font", "stylesheet"].includes(resourceType)) {
        await route.continue();
        return;
      }

      // Block everything else silently
      await route.abort();
    });

    console.log("[BrowserController] Chromium launched");
  }

  /**
   * Navigate to a lecture URL.
   * Enforces domain guard — throws if domain not approved.
   * Triggers EmergencyStop on domain violation.
   */
  async navigateTo(url: string, lectureId: string): Promise<void> {
    // Domain guard — must pass before any navigation
    try {
      this.guard.assertAllowed(url);
    } catch (err) {
      console.error("[BrowserController] Domain violation:", err);
      await EmergencyStop.trigger("domain_violation");
      throw err;
    }

    if (!this.browser || !this.page) {
      await this.launch();
    }

    await this.page!.goto(url, { waitUntil: "domcontentloaded" });

    this.playback = {
      lectureId,
      url,
      positionSec:  0,
      durationSec:  null,
      completed:    false,
      lastPolledAt: new Date(),
    };

    console.log(`[BrowserController] Navigated to lecture ${lectureId}`);
  }

  /**
   * Poll current YouTube playback position.
   * Uses page.evaluate to read video element state.
   * Returns null if no video element found.
   */
  async pollPlaybackPosition(): Promise<{
    positionSec: number;
    durationSec: number | null;
    completed:   boolean;
  } | null> {
    if (!this.page || !this.playback) return null;

    try {
      const state = await this.page.evaluate(() => {
        const video = document.querySelector("video") as HTMLVideoElement | null;
        if (!video) return null;
        return {
          positionSec: Math.floor(video.currentTime),
          durationSec: isFinite(video.duration) ? Math.floor(video.duration) : null,
          completed:   video.ended,
        };
      });

      if (state && this.playback) {
        this.playback.positionSec  = state.positionSec;
        this.playback.durationSec  = state.durationSec;
        this.playback.completed    = state.completed;
        this.playback.lastPolledAt = new Date();
      }

      return state;
    } catch {
      // Page may have been closed or navigated away
      return null;
    }
  }

  getCurrentPlayback(): PlaybackState | null {
    return this.playback ? { ...this.playback } : null;
  }

  /**
   * Close the browser and clear playback state.
   * Called by EmergencyStop and normal shutdown.
   */
  async close(): Promise<void> {
    this.playback = null;
    if (this.page) {
      try { await this.page.close(); } catch { /* ignore */ }
      this.page = null;
    }
    if (this.browser) {
      try { await this.browser.close(); } catch { /* ignore */ }
      this.browser = null;
    }
    console.log("[BrowserController] Chromium closed");
  }

  isOpen(): boolean {
    return this.browser !== null && this.page !== null;
  }
}
