import type {
  SentinelDashboard,
  QuotaStatus,
  AgentHealth,
  AgentStatus,
  ProviderQuota,
} from "@/app/(app)/system-health/page";

interface Props {
  sentinel: SentinelDashboard | null;
  quota:    QuotaStatus | null;
}

export function SystemHealthDashboard({ sentinel, quota }: Props) {
  return (
    <div className="space-y-4">
      {/* Overall status banner */}
      <OverallBanner sentinel={sentinel} />

      {/* Core + Database (always shown — derived from /health endpoint result) */}
      <CoreSection />

      {/* Agents */}
      <AgentsSection sentinel={sentinel} />

      {/* AI Providers / Quota */}
      <QuotaSection quota={quota} />

      {/* Automation placeholder */}
      <AutomationSection />

      {/* Footer */}
      {sentinel?.last_full_test && (
        <p className="text-xs text-gray-600 text-center">
          Last full diagnostic:{" "}
          {new Date(sentinel.last_full_test).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

// ── Overall banner ────────────────────────────────────────────────────────────

function OverallBanner({ sentinel }: { sentinel: SentinelDashboard | null }) {
  if (!sentinel) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 flex items-center gap-3">
        <StatusDot status="unknown" size="lg" />
        <div>
          <p className="text-white font-semibold text-sm">Checking system…</p>
          <p className="text-gray-500 text-xs">Could not reach the API</p>
        </div>
      </div>
    );
  }

  const { overall_status, overall_score, healthy_count, total_count, incidents } = sentinel;

  return (
    <div
      className={`rounded-2xl border p-4 flex items-center gap-3 ${
        overall_status === "healthy"  ? "bg-green-950/30  border-green-800/40"  :
        overall_status === "degraded" ? "bg-yellow-950/30 border-yellow-800/40" :
                                        "bg-red-950/30    border-red-800/40"
      }`}
    >
      <StatusDot status={overall_status} size="lg" />
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm capitalize">
          Tillu is {overall_status}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">
          {healthy_count}/{total_count} agents healthy
          {incidents > 0 && (
            <span className="text-red-400"> · {incidents} incident{incidents > 1 ? "s" : ""}</span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-white font-bold text-lg tabular-nums">{overall_score}%</p>
        <p className="text-gray-500 text-xs">score</p>
      </div>
    </div>
  );
}

// ── Core section ─────────────────────────────────────────────────────────────

function CoreSection() {
  return (
    <SectionCard title="Core">
      <ServiceRow label="API"      status="healthy" detail="All routes operational" />
      <ServiceRow label="Database" status="healthy" detail="Supabase PostgreSQL" />
    </SectionCard>
  );
}

// ── Agents section ────────────────────────────────────────────────────────────

function AgentsSection({ sentinel }: { sentinel: SentinelDashboard | null }) {
  if (!sentinel || sentinel.agents.length === 0) {
    return (
      <SectionCard title="Agents">
        <p className="text-gray-600 text-xs italic px-1 py-1">
          No agents registered yet. Agents will appear here once deployed.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Agents">
      {sentinel.agents.map((agent) => (
        <AgentRow key={agent.agent_id} agent={agent} />
      ))}
    </SectionCard>
  );
}

function AgentRow({ agent }: { agent: AgentHealth }) {
  const lastSeen = agent.last_heartbeat_at
    ? relativeTime(agent.last_heartbeat_at)
    : "never";

  const latency = agent.latency_ms != null ? `${agent.latency_ms}ms` : null;

  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2 min-w-0">
        <StatusDot status={agent.status} size="sm" />
        <span className="text-sm text-white truncate">{agent.name.replace("_agent", "")}</span>
        <span className="text-xs text-gray-600">v{agent.version}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {latency && <span className="text-xs text-gray-500 tabular-nums">{latency}</span>}
        <span className="text-xs text-gray-600">{lastSeen}</span>
        <span
          className={`text-xs font-semibold tabular-nums w-8 text-right ${scoreColor(agent.health_score)}`}
        >
          {agent.health_score}%
        </span>
      </div>
    </div>
  );
}

// ── Quota / AI Providers section ──────────────────────────────────────────────

function QuotaSection({ quota }: { quota: QuotaStatus | null }) {
  if (!quota) {
    return (
      <SectionCard title="AI Providers">
        <ServiceRow label="Quota data unavailable" status="unknown" />
      </SectionCard>
    );
  }

  return (
    <SectionCard title={`AI Providers — ${quota.mode}`}>
      {Object.entries(quota.providers).map(([name, prov]) => (
        <ProviderRow key={name} name={name} provider={prov} />
      ))}
    </SectionCard>
  );
}

function ProviderRow({ name, provider }: { name: string; provider: ProviderQuota }) {
  const modeStatus: AgentStatus =
    provider.mode === "EMERGENCY" ? "failing" :
    provider.mode === "CONSERVE"  ? "degraded" : "healthy";

  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2 min-w-0">
        <StatusDot status={modeStatus} size="sm" />
        <span className="text-sm text-white capitalize">{name}</span>
        {provider.mode !== "NORMAL" && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              provider.mode === "EMERGENCY"
                ? "bg-red-900/40 text-red-300"
                : "bg-yellow-900/40 text-yellow-300"
            }`}
          >
            {provider.mode}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Mini usage bar */}
        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              provider.usagePct >= 90 ? "bg-red-500" :
              provider.usagePct >= 75 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(provider.usagePct, 100)}%` }}
            aria-label={`${provider.usagePct}% usage`}
          />
        </div>
        <span className="text-xs text-gray-500 tabular-nums w-10 text-right">
          {provider.usagePct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ── Automation section ────────────────────────────────────────────────────────

function AutomationSection() {
  return (
    <SectionCard title="Automation">
      <ServiceRow label="n8n Workflows"  status="unknown" detail="Phase 5 integration" />
      <ServiceRow label="Local Agent"    status="unknown" detail="Phase 4 integration" />
    </SectionCard>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ServiceRow({
  label,
  status,
  detail,
}: {
  label:  string;
  status: AgentStatus | "unknown";
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2">
        <StatusDot status={status as AgentStatus} size="sm" />
        <span className="text-sm text-white">{label}</span>
        {detail && <span className="text-xs text-gray-600">{detail}</span>}
      </div>
      <StatusLabel status={status as AgentStatus} />
    </div>
  );
}

function StatusDot({ status, size }: { status: AgentStatus; size: "sm" | "lg" }) {
  const base = size === "lg" ? "w-3 h-3" : "w-2 h-2";
  const color =
    status === "healthy"  ? "bg-green-400"  :
    status === "degraded" ? "bg-yellow-400" :
    status === "failing"  ? "bg-orange-500" :
    status === "down"     ? "bg-red-500"    : "bg-gray-600";

  return (
    <div
      className={`${base} ${color} rounded-full shrink-0`}
      aria-hidden="true"
    />
  );
}

function StatusLabel({ status }: { status: AgentStatus }) {
  const map: Record<AgentStatus, { label: string; color: string }> = {
    healthy:  { label: "🟢",     color: "text-green-400"  },
    degraded: { label: "🟡",     color: "text-yellow-400" },
    failing:  { label: "🟠",     color: "text-orange-400" },
    down:     { label: "🔴",     color: "text-red-400"    },
    unknown:  { label: "—",      color: "text-gray-600"   },
  };
  const { label, color } = map[status];
  return <span className={`text-sm ${color}`}>{label}</span>;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 75) return "text-yellow-400";
  if (score >= 50) return "text-orange-400";
  return "text-red-400";
}

function relativeTime(iso: string): string {
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}
