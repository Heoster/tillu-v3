import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TodayProgress } from "@/components/home/TodayProgress";
import { NextBestActionCard } from "@/components/home/NextBestActionCard";
import { SystemHealthBadge } from "@/components/home/SystemHealthBadge";

/**
 * Home screen — "What should I do right now?"
 * Phase 1: shows today's progress + placeholder NBA card.
 * Phase 7: NBA card becomes fully intelligent.
 */
export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch student profile for greeting
  const { data: profile } = await supabase
    .from("student_profiles")
    .select("name")
    .eq("user_id", user?.id ?? "")
    .single();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold text-white">
          {greeting}{profile?.name ? `, ${profile.name}` : ""}
        </h2>
        <p className="text-gray-400 text-sm mt-0.5">Class 12 · CBSE Board</p>
      </div>

      {/* Next Best Action */}
      <NextBestActionCard />

      {/* Today's progress */}
      <TodayProgress />

      {/* System health */}
      <SystemHealthBadge />
    </div>
  );
}
