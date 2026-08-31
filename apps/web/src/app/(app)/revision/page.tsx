/**
 * Revision screen — forgetting radar, due items, memory health.
 * Phase 1: placeholder.
 * Phase 3: full revision manager.
 */
export default function RevisionPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Revision</h2>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center">
        <p className="text-3xl mb-3">🧠</p>
        <p className="text-gray-300 font-medium">Revision system coming in Phase 3</p>
        <p className="text-gray-500 text-sm mt-2">
          Spaced repetition, forgetting radar, and recall sessions will appear here.
        </p>
      </div>

      {/* Forgetting Radar placeholder */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">🔴 Forgetting Radar</h3>
        <p className="text-gray-600 text-sm italic">
          No data yet — complete some study sessions first.
        </p>
      </div>
    </div>
  );
}
