"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Summary {
  total_minutes: number;
  completed_sessions: number;
}

export function TodayProgress() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: sessions } = await supabase
        .from("study_sessions")
        .select("status, actual_duration_min")
        .eq("student_id", profile.id)
        .gte("started_at", todayStart.toISOString());

      const completed = (sessions ?? []).filter((s) => s.status === "completed");
      const totalMin = completed.reduce((sum, s) => sum + (s.actual_duration_min ?? 0), 0);
      setSummary({ total_minutes: totalMin, completed_sessions: completed.length });
    }
    void load();
  }, []);

  const hours = Math.floor((summary?.total_minutes ?? 0) / 60);
  const mins = (summary?.total_minutes ?? 0) % 60;
  const timeStr = summary
    ? summary.total_minutes > 0
      ? hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
      : "0m"
    : "—";

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Today</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xl font-bold text-white">{timeStr}</p>
          <p className="text-xs text-gray-500 mt-0.5">📚 Study time</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xl font-bold text-white">{summary?.completed_sessions ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">✅ Sessions done</p>
        </div>
      </div>
    </div>
  );
}
