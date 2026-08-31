/**
 * QuotaGuardian
 *
 * Tracks API usage per provider and enforces three operating modes:
 *   NORMAL    → full AI generation enabled
 *   CONSERVE  → reduce background AI calls, prefer cached/deterministic results
 *   EMERGENCY → stop all non-essential AI; use deterministic fallbacks only
 *
 * Thresholds (configurable via env):
 *   CONSERVE  at QUOTA_CONSERVE_THRESHOLD  (default 75% of daily limit)
 *   EMERGENCY at QUOTA_EMERGENCY_THRESHOLD (default 90% of daily limit)
 *
 * Usage tracking:
 *   - In-memory ring buffer per provider (fast, no DB round-trip on every call)
 *   - Persisted to quota_events table periodically (every flush interval)
 *   - Loaded from DB on startup so restart doesn't reset counters
 *
 * Integration with ModelRouter:
 *   - ModelRouter calls QuotaGuardian.recordUsage() after every successful call
 *   - ModelRouter calls QuotaGuardian.canUseProvider() before calling a provider
 *   - In EMERGENCY mode, ModelRouter skips all providers → AIUnavailableError
 *     → caller falls back to deterministic logic
 */

import { createLogger } from "@tillu/logging";
import type { QuotaMode } from "@tillu/schemas";

const logger = createLogger({ service: "quota_guardian" });

interface ProviderUsage {
  tokens:       number;
  requests:     number;
  errors:       number;
  lastResetAt:  Date;
}

interface ProviderLimits {
  dailyTokens:   number;
  conserveAt:    number;   // fraction 0–1
  emergencyAt:   number;   // fraction 0–1
}

export interface QuotaStatus {
  mode:      QuotaMode;
  providers: Record<string, {
    tokens:       number;
    requests:     number;
    dailyLimit:   number;
    usagePct:     number;
    mode:         QuotaMode;
  }>;
  timestamp: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_DAILY_TOKENS: Record<string, number> = {
  groq:         parseInt(process.env["QUOTA_GROQ_DAILY_TOKENS"]      ?? "100000", 10),
  cerebras:     parseInt(process.env["QUOTA_CEREBRAS_DAILY_TOKENS"]  ?? "100000", 10),
  openrouter:   parseInt(process.env["QUOTA_OPENROUTER_DAILY_TOKENS"] ?? "50000",  10),
  huggingface:  parseInt(process.env["QUOTA_HF_DAILY_TOKENS"]         ?? "30000",  10),
};

const CONSERVE_THRESHOLD  = parseFloat(process.env["QUOTA_CONSERVE_THRESHOLD"]  ?? "0.75");
const EMERGENCY_THRESHOLD = parseFloat(process.env["QUOTA_EMERGENCY_THRESHOLD"] ?? "0.90");

// ── QuotaGuardian ────────────────────────────────────────────────────────────

export class QuotaGuardian {
  private readonly usage   = new Map<string, ProviderUsage>();
  private readonly limits  = new Map<string, ProviderLimits>();
  /** Pending records to flush to the DB */
  private readonly pending: Array<{
    provider: string;
    model:    string | null;
    task:     string | null;
    tokens:   number;
    status:   "success" | "error" | "timeout";
  }> = [];

  constructor() {
    // Initialise usage buckets for all known providers
    for (const provider of Object.keys(DEFAULT_DAILY_TOKENS)) {
      this.resetUsage(provider);
      this.limits.set(provider, {
        dailyTokens: DEFAULT_DAILY_TOKENS[provider] ?? 100_000,
        conserveAt:  CONSERVE_THRESHOLD,
        emergencyAt: EMERGENCY_THRESHOLD,
      });
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Record a completed AI call. Called by ModelRouter after every generate().
   */
  recordUsage(
    provider: string,
    tokensUsed: number,
    status: "success" | "error" | "timeout",
    model?: string,
    task?: string
  ): void {
    const existing = this.usage.get(provider);
    const now = new Date();

    // Reset daily counter if it's a new calendar day
    if (existing && this.isNewDay(existing.lastResetAt, now)) {
      this.resetUsage(provider);
    }

    const u = this.getOrCreateUsage(provider);
    u.tokens   += tokensUsed;
    u.requests += 1;
    if (status !== "success") u.errors += 1;

    // Queue for DB flush
    this.pending.push({ provider, model: model ?? null, task: task ?? null, tokens: tokensUsed, status });

    const mode = this.getModeForProvider(provider);
    logger.info("quota_guardian.usage_recorded", {
      provider, tokens: tokensUsed, status,
      total_tokens: u.tokens,
      mode,
    });

    if (mode !== "NORMAL") {
      logger.warn("quota_guardian.threshold_reached", { provider, mode, usage_pct: this.getUsagePct(provider) });
    }
  }

  /**
   * Check if a provider can be used in the current mode.
   * Returns false in EMERGENCY mode.
   * Returns false for non-essential tasks in CONSERVE mode.
   */
  canUseProvider(provider: string, task?: string): boolean {
    const mode = this.getModeForProvider(provider);

    if (mode === "EMERGENCY") {
      logger.warn("quota_guardian.blocked_emergency", { provider, task });
      return false;
    }

    if (mode === "CONSERVE") {
      // In CONSERVE mode, allow essential tasks but block background ones
      const backgroundTasks = new Set([
        "research", "background_research", "weekly_report",
        "formula_generation", "non_essential",
      ]);
      if (task && backgroundTasks.has(task)) {
        logger.warn("quota_guardian.blocked_conserve", { provider, task });
        return false;
      }
    }

    return true;
  }

  /**
   * Get the current operating mode for a specific provider.
   */
  getModeForProvider(provider: string): QuotaMode {
    const usagePct = this.getUsagePct(provider);
    const limits = this.limits.get(provider);
    if (!limits) return "NORMAL";

    if (usagePct >= limits.emergencyAt) return "EMERGENCY";
    if (usagePct >= limits.conserveAt)  return "CONSERVE";
    return "NORMAL";
  }

  /**
   * Get the overall system quota mode (worst across all providers).
   */
  getOverallMode(): QuotaMode {
    let worstMode: QuotaMode = "NORMAL";
    for (const provider of this.usage.keys()) {
      const mode = this.getModeForProvider(provider);
      if (mode === "EMERGENCY") return "EMERGENCY";
      if (mode === "CONSERVE") worstMode = "CONSERVE";
    }
    return worstMode;
  }

  /**
   * Full quota status — for /quota/status endpoint and health dashboard.
   */
  getStatus(): QuotaStatus {
    const providers: QuotaStatus["providers"] = {};

    for (const [provider, u] of this.usage.entries()) {
      const limits  = this.limits.get(provider)!;
      const usagePct = this.getUsagePct(provider);
      providers[provider] = {
        tokens:     u.tokens,
        requests:   u.requests,
        dailyLimit: limits.dailyTokens,
        usagePct:   Math.round(usagePct * 1000) / 10, // percent with 1 decimal
        mode:       this.getModeForProvider(provider),
      };
    }

    return {
      mode:      this.getOverallMode(),
      providers,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Flush pending usage records to Supabase quota_events table.
   * Called periodically (e.g. every 60 seconds) rather than on every call
   * to avoid DB write pressure.
   */
  async flushToDb(db: { from: (table: string) => unknown }): Promise<void> {
    if (this.pending.length === 0) return;

    const records = this.pending.splice(0, this.pending.length);
    const rows = records.map((r) => ({
      provider:    r.provider,
      model:       r.model,
      task:        r.task,
      tokens_used: r.tokens,
      status:      r.status,
    }));

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db.from("quota_events") as any).insert(rows);
      if (error) {
        logger.error("quota_guardian.flush_failed", { error: error.message, count: rows.length });
        // Re-queue on failure
        this.pending.unshift(...records);
      } else {
        logger.info("quota_guardian.flushed", { count: rows.length });
      }
    } catch (err) {
      logger.error("quota_guardian.flush_error", { error: err instanceof Error ? err.message : String(err) });
      this.pending.unshift(...records);
    }
  }

  /**
   * Reset usage counters for a provider (called at start of new day).
   */
  resetUsage(provider: string): void {
    this.usage.set(provider, {
      tokens:      0,
      requests:    0,
      errors:      0,
      lastResetAt: new Date(),
    });
  }

  /**
   * Manually set usage for a provider (e.g. loaded from DB on startup).
   */
  setUsage(provider: string, tokens: number, requests: number): void {
    const u = this.getOrCreateUsage(provider);
    u.tokens   = tokens;
    u.requests = requests;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private getUsagePct(provider: string): number {
    const u = this.usage.get(provider);
    const limits = this.limits.get(provider);
    if (!u || !limits || limits.dailyTokens === 0) return 0;
    return u.tokens / limits.dailyTokens;
  }

  private getOrCreateUsage(provider: string): ProviderUsage {
    if (!this.usage.has(provider)) {
      this.resetUsage(provider);
    }
    return this.usage.get(provider)!;
  }

  private isNewDay(lastReset: Date, now: Date): boolean {
    return (
      lastReset.getUTCFullYear() !== now.getUTCFullYear() ||
      lastReset.getUTCMonth()    !== now.getUTCMonth() ||
      lastReset.getUTCDate()     !== now.getUTCDate()
    );
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _quotaGuardian: QuotaGuardian | null = null;

export function getQuotaGuardian(): QuotaGuardian {
  if (!_quotaGuardian) {
    _quotaGuardian = new QuotaGuardian();
  }
  return _quotaGuardian;
}
