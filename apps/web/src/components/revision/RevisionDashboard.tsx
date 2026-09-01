"use client";

import Link from "next/link";
import type { RevisionDashboardData, RevisionItem } from "@/app/(app)/revision/page";

interface Props {
  dashboard: RevisionDashboardData | null;
}

export function RevisionDashboard({ dashboard }: Props) {
  if (!dashboard) {
    return <RevisionEmpty />;
  }

  const { due_now, coming_up, memory_health } = dashboard;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-white">Revision</h2>

      {/* Due Now */}
      <section>
        <SectionHeader
          icon="🔴"
          label="Due Now"
          count={due_now.length}
          urgent={due_now.length > 0}
        />
        {due_now.length === 0 ? (
          <EmptyState message="Nothing overdue — well done." />
        ) : (
          <div className="space-y-2">
            {due_now.map((item) => (
              <RevisionItemCard key={item.id} item={item} urgency="high" />
            ))}
          </div>
        )}
      </section>

      {/* Start Revision CTA */}
      {due_now.length > 0 && (
        <button
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
          onClick={() => {/* Phase 5: open revision session */}}
        >
          Start Revision ({due_now.length} due)
        </button>
      )}

      {/* Coming Up */}
      {coming_up.length > 0 && (
        <section>
          <SectionHeader icon="🟡" label="Coming Up" count={coming_up.length} />
          <div className="space-y-2">
            {coming_up.map((item) => (
              <RevisionItemCard key={item.id} item={item} urgency="medium" />
            ))}
          </div>
        </section>
      )}

      {/* Memory Health */}
      {memory_health.total > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-400 mb-3">🧠 Memory Health</h3>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
            <MemoryBar label="Strong" pct={memory_health.strong} count={memory_health.strong_count} color="bg-green-500" />
            <MemoryBar label="Stable" pct={memory_health.stable} count={memory_health.stable_count} color="bg-yellow-500" />
            <MemoryBar label="Weak"   pct={memory_health.weak}   count={memory_health.weak_count}   color="bg-red-500" />
            <p className="text-xs text-gray-600 text-right">{memory_health.total} concepts tracked</p>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  count,
  urgent = false,
}: {
  icon: string;
  label: string;
  count: number;
  urgent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className={`text-sm font-medium ${urgent && count > 0 ? "text-red-400" : "text-gray-400"}`}>
        {icon} {label}
      </h3>
      {count > 0 && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          urgent ? "bg-red-900/40 text-red-300" : "bg-yellow-900/40 text-yellow-300"
        }`}>
          {count}
        </span>
      )}
    </div>
  );
}

function RevisionItemCard({
  item,
  urgency,
}: {
  item: RevisionItem;
  urgency: "high" | "medium";
}) {
  const conceptName = item.concept?.name ?? "Unknown concept";
  const subjectCode = item.concept?.chapters?.subjects?.code;
  const chapterName = item.concept?.chapters?.name;

  const priorityPct = Math.round((item.priority ?? 0) * 100);
  const overdue = item.overdue ?? (item.next_review_at != null && item.next_review_at <= new Date().toISOString());

  return (
    <div className={`bg-gray-900 rounded-xl border p-4 space-y-1 transition-colors ${
      urgency === "high" ? "border-red-800/40 hover:border-red-700" : "border-gray-800 hover:border-gray-600"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-tight truncate">{conceptName}</p>
          {chapterName && (
            <p className="text-gray-500 text-xs mt-0.5 truncate">
              {subjectCode && <span className="text-gray-600">{subjectCode} · </span>}
              {chapterName}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {overdue && (
            <span className="text-xs text-red-400 font-semibold">overdue</span>
          )}
          <span className={`text-xs ${
            item.revision_type === "formula" ? "text-purple-400" :
            item.revision_type === "pyq"     ? "text-blue-400"   : "text-gray-500"
          }`}>
            {item.revision_type}
          </span>
        </div>
      </div>

      {/* Priority bar */}
      <div className="flex items-center gap-2 pt-0.5">
        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              priorityPct > 70 ? "bg-red-500" :
              priorityPct > 40 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${priorityPct}%` }}
            aria-label={`Priority ${priorityPct}%`}
          />
        </div>
        <span className="text-xs text-gray-600 tabular-nums w-8 text-right">
          {priorityPct}%
        </span>
      </div>
    </div>
  );
}

function MemoryBar({
  label,
  pct,
  count,
  color,
}: {
  label: string;
  pct: number;
  count: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs text-gray-500 tabular-nums">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
          aria-label={`${label}: ${pct}%`}
        />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-gray-600 text-sm italic px-1 py-2">{message}</p>
  );
}

function RevisionEmpty() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Revision</h2>
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center space-y-3">
        <p className="text-3xl">🧠</p>
        <p className="text-gray-300 font-medium">No revision items yet</p>
        <p className="text-gray-500 text-sm">
          Complete your first study session and revision will be scheduled automatically.
        </p>
        <Link
          href="/study"
          className="inline-block mt-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
        >
          Go to Study →
        </Link>
      </div>
    </div>
  );
}
