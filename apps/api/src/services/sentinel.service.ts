/**
 * SentinelService
 *
 * Monitors all registered agents for liveness, readiness, and correctness.
 * Runs synthetic tests, computes health scores, and emits AGENT_HEALTH_CHANGED events.
 *
 * Health score formula (TRD §42):
 *   30% liveness    — is the agent responding to /health?
 *   40% correctness — are synthetic tests passing?
 *   20% reliability — success rate over last N heartbeats
 *   10% latency     — p95 latency vs threshold
 *
 * Thresholds:
 *   90–100 → HEALTHY
 *   75–89  → DEGRADED
 *   50–74  → FAILING
 *   0–49   → DOWN
 */

import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { EventBus } from "@tillu/events";
import { EventType } from "@tillu/schemas";
import { withTimeout } from "@tillu/utilities";

const logger = createLogger({ service: "sentinel_service" });

// ── Health score constants ────────────────────────────────────────────────────

const WEIGHT_LIVENESS    = 0.30;
const WEIGHT_CORRECTNESS = 0.40;
const WEIGHT_RELIABILITY = 0.20;
const WEIGHT_LATENCY     = 0.10;

/** Latency threshold (ms) — above this, latency score starts degrading */
const LATENCY_THRESHOLD_MS = 3000;
/** Heartbeat timeout — if an agent hasn't reported in this many ms, consider it stale */
const HEARTBEAT_TIMEOUT_MS = parseInt(
  process.env["SENTINEL_HEARTBEAT_TIMEOUT_MS"] ?? "120000",
  10
);
/** Number of recent heartbeats to use for reliability calculation */
const RELIABILITY_WINDOW = 10;

export type AgentHealthStatus = "healthy" | "degraded" | "failing" | "down" | "unknown";

export interface AgentHealth {
  agent_id:     string;
  name:         string;
  version:      string;
  endpoint:     string | null;
  status:       AgentHealthStatus;
  health_score: number;
  liveness:     boolean;
  last_heartbeat_at: string | null;
  last_test_at:      string | null;
  last_test_passed:  boolean | null;
  failure_count:     number;
  latency_ms:        number | null;
}

export interface SentinelDashboard {
  overall_status:  AgentHealthStatus;
  overall_score:   number;
  agents:          AgentHealth[];
  last_full_test:  string | null;
  incidents:       number;    // agents currently not HEALTHY
  healthy_count:   number;
  total_count:     number;
  timestamp:       string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SentinelService {
  constructor(private readonly eventBus: EventBus) {}

  /**
   * Ping all enabled agents, record heartbeats, update health scores.
   * Called by the n8n scheduled health-check workflow every 60 seconds.
   */
  async pollAllAgents(): Promise<AgentHealth[]> {
    const db = getServiceClient();
    const { data: agents, error } = await db
      .from("agents")
      .select("*")
      .eq("enabled", true);

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    const results: AgentHealth[] = [];

    for (const agent of agents ?? []) {
      const health = await this.pollAgent(agent);
      results.push(health);
    }

    return results;
  }

  /**
   * Poll a single agent: check /health, compute score, persist, emit event if changed.
   */
  async pollAgent(agent: {
    id: string;
    name: string;
    version: string;
    endpoint: string | null;
    health_status: string;
    health_score: number | null;
    failure_count: number;
    last_heartbeat_at: string | null;
  }): Promise<AgentHealth> {
    const db = getServiceClient();
    const start = Date.now();

    let liveness = false;
    let latencyMs: number | null = null;
    let remoteVersion: string | null = null;

    // ── Liveness check via GET /health ───────────────────────────────────────
    if (agent.endpoint) {
      try {
        const response = await withTimeout(
          () => fetch(`${agent.endpoint}/health`),
          parseInt(process.env["SENTINEL_POLL_INTERVAL_MS"] ?? "10000", 10),
          `${agent.name}/health`
        );
        latencyMs = Date.now() - start;
        if (response.ok) {
          liveness = true;
          const body = await response.json() as { version?: string };
          remoteVersion = body.version ?? null;
        }
      } catch {
        latencyMs = Date.now() - start;
        liveness = false;
      }
    }

    // ── Get last synthetic test result ───────────────────────────────────────
    const { data: lastTest } = await db
      .from("agent_tests")
      .select("status, latency_ms, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const lastTestPassed = lastTest ? lastTest.status === "pass" : null;
    const lastTestAt = lastTest?.created_at ?? null;

    // ── Reliability: last N heartbeats ───────────────────────────────────────
    const { data: recentHeartbeats } = await db
      .from("agent_heartbeats")
      .select("status")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(RELIABILITY_WINDOW);

    const hbList = recentHeartbeats ?? [];
    const reliabilityRate =
      hbList.length === 0
        ? 0.5 // no data — assume 50%
        : hbList.filter((h) => h.status === "ok").length / hbList.length;

    // ── Compute health score ─────────────────────────────────────────────────
    const livenessScore = liveness ? 100 : 0;
    const correctnessScore = lastTestPassed === null ? 50 : lastTestPassed ? 100 : 0;
    const reliabilityScore = Math.round(reliabilityRate * 100);
    const latencyScore =
      latencyMs === null
        ? 50
        : latencyMs <= LATENCY_THRESHOLD_MS
        ? 100
        : Math.max(0, 100 - Math.round(((latencyMs - LATENCY_THRESHOLD_MS) / LATENCY_THRESHOLD_MS) * 100));

    const healthScore = Math.round(
      livenessScore    * WEIGHT_LIVENESS +
      correctnessScore * WEIGHT_CORRECTNESS +
      reliabilityScore * WEIGHT_RELIABILITY +
      latencyScore     * WEIGHT_LATENCY
    );

    const newStatus = scoreToStatus(healthScore);
    const prevStatus = agent.health_status as AgentHealthStatus;

    // ── Record heartbeat ─────────────────────────────────────────────────────
    await db.from("agent_heartbeats").insert({
      agent_id:   agent.id,
      status:     liveness ? "ok" : "error",
      latency_ms: latencyMs,
      version:    remoteVersion ?? agent.version,
    });

    // ── Update agent record ──────────────────────────────────────────────────
    const newFailureCount =
      liveness ? 0 : (agent.failure_count ?? 0) + 1;

    await db
      .from("agents")
      .update({
        health_status:     newStatus,
        health_score:      healthScore,
        last_heartbeat_at: new Date().toISOString(),
        last_success_at:   liveness ? new Date().toISOString() : undefined,
        last_failure_at:   !liveness ? new Date().toISOString() : undefined,
        failure_count:     newFailureCount,
        updated_at:        new Date().toISOString(),
      })
      .eq("id", agent.id);

    // ── Emit AGENT_HEALTH_CHANGED if status changed ──────────────────────────
    if (newStatus !== prevStatus) {
      await this.eventBus
        .emit(
          EventType.AGENT_HEALTH_CHANGED,
          agent.id,
          {
            agent_id:    agent.id,
            agent_name:  agent.name,
            prev_status: prevStatus,
            new_status:  newStatus,
            health_score: healthScore,
          },
          { source: "sentinel_service" }
        )
        .catch((err: unknown) => {
          logger.warn("sentinel.event_emit_failed", {
            agent: agent.name,
            error: err instanceof Error ? err.message : String(err),
          });
        });

      // Record agent failure if going from healthy/degraded → failing/down
      if (["failing", "down"].includes(newStatus) && !["failing", "down"].includes(prevStatus)) {
        await db.from("agent_failures").insert({
          agent_id:      agent.id,
          error_code:    liveness ? "SYNTHETIC_TEST_FAILED" : "LIVENESS_FAILED",
          error_message: liveness ? "Synthetic test failed" : "Agent did not respond to /health",
          recovered:     false,
        });
      }

      logger.info("sentinel.status_changed", {
        agent: agent.name,
        prev: prevStatus,
        next: newStatus,
        score: healthScore,
      });
    }

    return {
      agent_id:          agent.id,
      name:              agent.name,
      version:           remoteVersion ?? agent.version,
      endpoint:          agent.endpoint,
      status:            newStatus,
      health_score:      healthScore,
      liveness,
      last_heartbeat_at: new Date().toISOString(),
      last_test_at:      lastTestAt,
      last_test_passed:  lastTestPassed,
      failure_count:     newFailureCount,
      latency_ms:        latencyMs,
    };
  }

  /**
   * Run synthetic test on a named agent via POST /test.
   */
  async runSyntheticTest(agentName: string): Promise<{
    pass: boolean;
    details: string;
    latency_ms: number;
  }> {
    const db = getServiceClient();
    const { data: agent } = await db
      .from("agents")
      .select("id, name, endpoint")
      .eq("name", agentName)
      .single();

    if (!agent) {
      throw new TilluError(`Agent "${agentName}" not found in registry`, "NOT_FOUND", false);
    }

    if (!agent.endpoint) {
      return { pass: false, details: "No endpoint configured", latency_ms: 0 };
    }

    const start = Date.now();
    let pass = false;
    let details = "";

    try {
      const response = await withTimeout(
        () =>
          fetch(`${agent.endpoint}/test`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }),
        30_000,
        `${agentName}/test`
      );
      const latencyMs = Date.now() - start;
      const body = await response.json() as { pass?: boolean; details?: string };
      pass = response.ok && (body.pass === true);
      details = body.details ?? (response.ok ? "Test passed" : `HTTP ${response.status}`);

      // Record test result
      await db.from("agent_tests").insert({
        agent_id:   agent.id,
        test_type:  "synthetic",
        status:     pass ? "pass" : "fail",
        details:    { details },
        latency_ms: latencyMs,
      });

      return { pass, details, latency_ms: latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - start;
      details = err instanceof Error ? err.message : String(err);

      await db.from("agent_tests").insert({
        agent_id:   agent.id,
        test_type:  "synthetic",
        status:     "timeout",
        details:    { error: details },
        latency_ms: latencyMs,
      });

      return { pass: false, details, latency_ms: latencyMs };
    }
  }

  /**
   * Get the full system health dashboard.
   */
  async getDashboard(): Promise<SentinelDashboard> {
    const db = getServiceClient();

    const { data: agents } = await db
      .from("agents")
      .select(`
        id, name, version, endpoint, enabled,
        health_status, health_score, failure_count,
        last_heartbeat_at, last_success_at, last_failure_at, updated_at
      `)
      .order("name");

    const now = new Date().toISOString();
    const agentHealths: AgentHealth[] = (agents ?? []).map((a) => {
      // Determine liveness from last heartbeat timestamp
      const liveness =
        a.last_heartbeat_at != null &&
        Date.now() - new Date(a.last_heartbeat_at).getTime() < HEARTBEAT_TIMEOUT_MS;

      return {
        agent_id:          a.id,
        name:              a.name,
        version:           a.version,
        endpoint:          a.endpoint,
        status:            (a.health_status ?? "unknown") as AgentHealthStatus,
        health_score:      a.health_score ?? 0,
        liveness,
        last_heartbeat_at: a.last_heartbeat_at,
        last_test_at:      null,
        last_test_passed:  null,
        failure_count:     a.failure_count ?? 0,
        latency_ms:        null,
      };
    });

    // Last full test run
    const { data: lastTest } = await db
      .from("agent_tests")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const healthyCount = agentHealths.filter((a) => a.status === "healthy").length;
    const incidents = agentHealths.filter((a) => a.status !== "healthy" && a.status !== "unknown").length;

    const avgScore =
      agentHealths.length > 0
        ? Math.round(agentHealths.reduce((sum, a) => sum + a.health_score, 0) / agentHealths.length)
        : 0;

    return {
      overall_status:  scoreToStatus(avgScore),
      overall_score:   avgScore,
      agents:          agentHealths,
      last_full_test:  lastTest?.created_at ?? null,
      incidents,
      healthy_count:   healthyCount,
      total_count:     agentHealths.length,
      timestamp:       now,
    };
  }

  /**
   * Register an agent in the registry (idempotent).
   */
  async registerAgent(agent: {
    name: string;
    version: string;
    endpoint: string;
    capabilities?: string[];
    priority?: number;
  }): Promise<void> {
    const db = getServiceClient();
    await db.from("agents").upsert(
      {
        name:         agent.name,
        version:      agent.version,
        endpoint:     agent.endpoint,
        enabled:      true,
        priority:     agent.priority ?? 100,
        capabilities: agent.capabilities ?? [],
        health_status: "unknown",
      },
      { onConflict: "name" }
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreToStatus(score: number): AgentHealthStatus {
  if (score >= 90) return "healthy";
  if (score >= 75) return "degraded";
  if (score >= 50) return "failing";
  return "down";
}
