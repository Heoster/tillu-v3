import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SystemHealthDashboard } from "@/components/health/SystemHealthDashboard";

/**
 * System Health screen — live data from GET /sentinel/dashboard and GET /quota/status.
 * Accessible via the health dot in TopBar.
 *
 * Phase 3: agents, overall score, quota mode.
 * Phase 4+: local agent status, n8n workflow health.
 */
export default async function SystemHealthPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: authSession } = await supabase.auth.getSession();
  const token = authSession?.session?.access_token ?? "";

  const apiBase = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";

  // Fetch sentinel dashboard and quota status in parallel
  const [sentinelData, quotaData] = await Promise.allSettled([
    token
      ? fetch(`${apiBase}/sentinel/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 30 },
        }).then((r) => (r.ok ? (r.json() as Promise<SentinelDashboard>) : null))
      : Promise.resolve(null),

    token
      ? fetch(`${apiBase}/quota/status`, {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 60 },
        }).then((r) => (r.ok ? (r.json() as Promise<QuotaStatus>) : null))
      : Promise.resolve(null),
  ]);

  const sentinel = sentinelData.status === "fulfilled" ? sentinelData.value : null;
  const quota    = quotaData.status    === "fulfilled" ? quotaData.value    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/home" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Home
        </Link>
        <span className="text-gray-700">/</span>
        <h2 className="text-white font-semibold">System Health</h2>
      </div>

      <SystemHealthDashboard sentinel={sentinel} quota={quota} />
    </div>
  );
}

// ── Shared types ──────────────────────────────────────────────────────────────

export type AgentStatus = "healthy" | "degraded" | "failing" | "down" | "unknown";

export interface AgentHealth {
  agent_id:          string;
  name:              string;
  version:           string;
  endpoint:          string | null;
  status:            AgentStatus;
  health_score:      number;
  liveness:          boolean;
  last_heartbeat_at: string | null;
  last_test_at:      string | null;
  last_test_passed:  boolean | null;
  failure_count:     number;
  latency_ms:        number | null;
}

export interface SentinelDashboard {
  overall_status: AgentStatus;
  overall_score:  number;
  agents:         AgentHealth[];
  last_full_test: string | null;
  incidents:      number;
  healthy_count:  number;
  total_count:    number;
  timestamp:      string;
}

export interface ProviderQuota {
  tokens:     number;
  requests:   number;
  dailyLimit: number;
  usagePct:   number;
  mode:       "NORMAL" | "CONSERVE" | "EMERGENCY";
}

export interface QuotaStatus {
  mode:      "NORMAL" | "CONSERVE" | "EMERGENCY";
  providers: Record<string, ProviderQuota>;
  timestamp: string;
}
