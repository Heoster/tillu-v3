import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Progress screen — mastery, coverage, mistakes, board readiness.
 * Phase 1: shows real today-summary from DB.
 * Phase 2+: mastery scores, Phase 4: mistakes, Phase 7: board readiness.
 */
export default async function ProgressPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch student profile
  const { data: profile } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", user?.id ?? "")
    .single();

  // Today's sessions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todaySessions } = await supabase
    .from("study_sessions")
    .select("id, activity_type, status, actual_duration_min")
    .eq("student_id", profile?.id ?? "")
    .gte("started_at", todayStart.toISOString());

  const completedSessions = (todaySessions ?? []).filter((s) => s.status === "completed");
  const totalMin = completedSessions.reduce((sum, s) => sum + (s.actual_duration_min ?? 0), 0);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  // All-time sessions count
  const { count: allTimeCount } = await supabase
    .from("study_sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", profile?.id ?? "")
    .eq("status", "completed");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Progress</h2>

      {/* Today summary */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-400">Today</h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Study time" value={totalMin > 0 ? `${hours}h ${mins}m` : "0m"} />
          <StatCard label="Sessions" value={String(completedSessions.length)} />
          <StatCard label="All-time" value={String(allTimeCount ?? 0)} />
        </div>
      </div>

      {/* Mastery — Phase 2 placeholder */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Mastery</h3>
        <p className="text-gray-600 text-sm italic">
          Mastery scores appear after Phase 2 is complete.
        </p>
      </div>

      {/* Board readiness — Phase 7 placeholder */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Board Readiness</h3>
        <p className="text-gray-600 text-sm italic">
          Full readiness dashboard launches in Phase 7.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
