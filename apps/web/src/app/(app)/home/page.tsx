import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TodayProgress } from "@/components/home/TodayProgress";
import { NextBestActionCard } from "@/components/home/NextBestActionCard";
import { SystemHealthBadge } from "@/components/home/SystemHealthBadge";
import { ForgettingRadar } from "@/components/home/ForgettingRadar";

/**
 * Home screen — "What should I do right now?"
 *
 * Phase 1: greeting, NBA placeholder, today progress, system health badge.
 * Phase 3: live forgetting radar from GET /revision/radar.
 * Phase 7: NBA card becomes fully intelligent.
 */
export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Greeting name
  const { data: profile } = await supabase
    .from("student_profiles")
    .select("name")
    .eq("user_id", user?.id ?? "")
    .single();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Fetch forgetting radar (top 5 concepts at risk)
  const { data: authSession } = await supabase.auth.getSession();
  const token = authSession?.session?.access_token ?? "";

  let radarItems: RadarItem[] = [];
  if (token) {
    try {
      const apiBase = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";
      const res = await fetch(`${apiBase}/revision/radar?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 }, // 5-minute cache — radar doesn't need to be real-time
      });
      if (res.ok) {
        radarItems = await res.json() as RadarItem[];
      }
    } catch {
      // non-fatal
    }
  }

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

      {/* Forgetting Radar — live from Phase 3 RevisionService */}
      <ForgettingRadar items={radarItems} />

      {/* System health */}
      <SystemHealthBadge />
    </div>
  );
}

export interface RadarItem {
  revision_item_id: string;
  concept_id:       string;
  revision_type:    string;
  priority:         number;
  next_review_at:   string | null;
  overdue:          boolean;
  concept: {
    id:         string;
    name:       string;
    importance: number;
    chapters?: {
      name: string;
      subjects?: { name: string; code: string };
    };
  } | null;
}
