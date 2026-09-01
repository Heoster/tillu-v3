import Link from "next/link";
import type {
  MistakeBankEntry,
  MistakePattern,
} from "@/app/(app)/mistakes/page";

interface Props {
  bank:     MistakeBankEntry[];
  patterns: MistakePattern[];
}

const ERROR_FRIENDLY: Record<string, string> = {
  conceptual:    "Concept misunderstood",
  formula:       "Wrong formula",
  calculation:   "Arithmetic error",
  sign:          "Sign convention",
  unit:          "Unit error",
  carelessness:  "Careless mistake",
  misreading:    "Misread question",
  memory:        "Recall failure",
  time_pressure: "Time pressure",
  presentation:  "Poor presentation",
};

export function MistakeBank({ bank, patterns }: Props) {
  const totalMistakes   = bank.reduce((s, e) => s + e.total, 0);
  const totalUnresolved = bank.reduce((s, e) => s + e.unresolved, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Mistake Bank</h2>
        {totalUnresolved > 0 && (
          <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full font-semibold">
            {totalUnresolved} unresolved
          </span>
        )}
      </div>

      {/* Active Patterns */}
      {patterns.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-red-400 mb-2">⚠ Recurring Patterns</h3>
          <div className="space-y-2">
            {patterns.map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        </section>
      )}

      {/* Mistake Bank by concept */}
      {bank.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center space-y-2">
          <p className="text-2xl">✅</p>
          <p className="text-gray-300 font-medium">No mistakes recorded yet</p>
          <p className="text-gray-500 text-sm">
            Mistakes are tracked automatically when you answer questions.
          </p>
        </div>
      ) : (
        <section>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            All mistakes · {totalMistakes} total
          </h3>
          <div className="space-y-2">
            {bank.map((entry) => (
              <MistakeBankCard key={entry.concept_id} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Pattern card ──────────────────────────────────────────────────────────────

function PatternCard({ pattern }: { pattern: MistakePattern }) {
  const conceptName = pattern.concepts?.name ?? "Unknown concept";
  const subjectCode = pattern.concepts?.chapters?.subjects?.code;

  const severityColor =
    pattern.severity === "high"   ? "border-red-700/50 bg-red-950/20" :
    pattern.severity === "medium" ? "border-yellow-700/50 bg-yellow-950/20" :
                                    "border-orange-700/50 bg-orange-950/20";

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${severityColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{conceptName}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {subjectCode && <span>{subjectCode} · </span>}
            {ERROR_FRIENDLY[pattern.error_type] ?? pattern.error_type}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-red-300">{pattern.frequency}×</p>
          <p className="text-xs text-gray-600 capitalize">{pattern.severity}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          First seen {new Date(pattern.first_seen_at).toLocaleDateString()}
        </p>
        <button
          className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800/40 hover:border-indigo-600 px-2 py-1 rounded-lg transition-colors"
          onClick={() => {/* Phase 5: open repair session */}}
        >
          Start repair
        </button>
      </div>
    </div>
  );
}

// ── Mistake bank card (per concept) ──────────────────────────────────────────

function MistakeBankCard({ entry }: { entry: MistakeBankEntry }) {
  const urgencyColor =
    entry.unresolved >= 3 ? "border-red-800/40"    :
    entry.unresolved >= 1 ? "border-yellow-800/40" :
                            "border-gray-800";

  return (
    <div className={`bg-gray-900 rounded-xl border p-4 space-y-2 ${urgencyColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{entry.concept_name}</p>
          <p className="text-gray-500 text-xs mt-0.5 truncate">
            {entry.subject_code && <span>{entry.subject_code} · </span>}
            {entry.chapter_name}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-white tabular-nums">{entry.total}</p>
          <p className="text-xs text-gray-600">mistake{entry.total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Top error type */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Common issue:{" "}
          <span className="text-gray-300">
            {ERROR_FRIENDLY[entry.top_error] ?? entry.top_error}
          </span>
        </span>
        {entry.unresolved > 0 && (
          <span className="text-xs text-red-400 font-semibold">
            {entry.unresolved} open
          </span>
        )}
      </div>

      {/* Error type breakdown */}
      <div className="flex flex-wrap gap-1">
        {Object.entries(entry.error_types)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([type, count]) => (
            <span
              key={type}
              className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full"
            >
              {ERROR_FRIENDLY[type] ?? type} ×{count}
            </span>
          ))}
      </div>
    </div>
  );
}
