/**
 * Next Best Action card.
 * Phase 1: static placeholder — shows what the card will look like.
 * Phase 7: driven by NBAEngine with real mastery + revision data.
 */
export function NextBestActionCard() {
  return (
    <div className="bg-gray-900 rounded-2xl border border-indigo-800/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
          Your Next Move
        </span>
        <span className="text-xs text-gray-500">Phase 1</span>
      </div>

      {/* Placeholder action */}
      <div className="space-y-1">
        <p className="text-white font-semibold text-lg leading-snug">
          Start a study session
        </p>
        <p className="text-gray-400 text-sm">
          Pick a subject below and begin your first session.
        </p>
      </div>

      {/* Why tags */}
      <div className="flex gap-2 flex-wrap">
        <Tag color="yellow" label="Get started" />
        <Tag color="blue" label="Tracks progress" />
      </div>

      <button
        onClick={() => {
          window.location.href = "/study";
        }}
        className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
      >
        Go to Study →
      </button>
    </div>
  );
}

function Tag({ color, label }: { color: "red" | "yellow" | "blue" | "green"; label: string }) {
  const colors = {
    red:    "bg-red-900/40 text-red-300",
    yellow: "bg-yellow-900/40 text-yellow-300",
    blue:   "bg-blue-900/40 text-blue-300",
    green:  "bg-green-900/40 text-green-300",
  } as const;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[color]}`}>{label}</span>
  );
}
