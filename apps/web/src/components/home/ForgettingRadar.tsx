import Link from "next/link";
import type { RadarItem } from "@/app/(app)/home/page";

interface Props {
  items: RadarItem[];
}

/**
 * Forgetting Radar — shows the top concepts at risk of being forgotten.
 * Data from GET /revision/radar, rendered as a Server Component (no "use client").
 *
 * Colour coding:
 *   priority > 0.7  → 🔴 high risk
 *   priority > 0.4  → 🟡 medium risk
 *   priority ≤ 0.4  → 🟢 low risk
 */
export function ForgettingRadar({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">🔴 Forgetting Radar</h3>
        <p className="text-gray-600 text-xs italic">
          No concepts tracked yet — start a study session to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">🔴 Forgetting Radar</h3>
        <Link
          href="/revision"
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          See all →
        </Link>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const risk = item.priority;
          const { dot, textColor } = riskStyle(risk, item.overdue);
          const conceptName  = item.concept?.name ?? "Unknown concept";
          const subjectCode  = item.concept?.chapters?.subjects?.code;

          return (
            <div
              key={item.revision_item_id}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm ${dot}`} aria-hidden="true">●</span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${textColor}`}>
                    {conceptName}
                  </p>
                  {subjectCode && (
                    <p className="text-xs text-gray-600">{subjectCode}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.overdue && (
                  <span className="text-xs text-red-400 font-semibold">due</span>
                )}
                {/* Mini priority bar */}
                <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor(risk)}`}
                    style={{ width: `${Math.round(risk * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Style helpers ────────────────────────────────────────────────────────────

function riskStyle(priority: number, overdue: boolean) {
  if (overdue || priority > 0.7) {
    return { dot: "text-red-500",    textColor: "text-white" };
  }
  if (priority > 0.4) {
    return { dot: "text-yellow-500", textColor: "text-gray-200" };
  }
  return   { dot: "text-green-500",  textColor: "text-gray-400" };
}

function barColor(priority: number): string {
  if (priority > 0.7) return "bg-red-500";
  if (priority > 0.4) return "bg-yellow-500";
  return "bg-green-500";
}
