/**
 * Plan screen — daily study plan.
 * Phase 1: empty state with placeholder.
 * Phase 6: fully adaptive planner.
 */
export default function PlanPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Today&apos;s Plan</h2>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center">
        <p className="text-3xl mb-3">📅</p>
        <p className="text-gray-300 font-medium">Your plan will appear here</p>
        <p className="text-gray-500 text-sm mt-2">
          The adaptive planner launches in Phase 6.{" "}
          For now, use the Study tab to start any session.
        </p>
      </div>
    </div>
  );
}
