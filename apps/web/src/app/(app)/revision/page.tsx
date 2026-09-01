import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RevisionDashboard } from "@/components/revision/RevisionDashboard";

/**
 * Revision screen — live data from GET /revision/dashboard.
 * Phase 3: due_now, coming_up, memory_health.
 * Phase 5+: revision session UI, recall questions.
 */
export default async function RevisionPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token ?? "";

  // Fetch revision dashboard from API
  let dashboard: RevisionDashboardData | null = null;
  if (token) {
    try {
      const apiBase = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";
      const res = await fetch(`${apiBase}/revision/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60 }, // revalidate every 60s
      });
      if (res.ok) {
        dashboard = await res.json() as RevisionDashboardData;
      }
    } catch {
      // non-fatal — show empty state
    }
  }

  return <RevisionDashboard dashboard={dashboard} />;
}

// ── Types shared with component ───────────────────────────────────────────────

export interface RevisionConcept {
  id: string;
  name: string;
  importance: number;
  chapters?: { name: string; subjects?: { name: string; code: string } };
}

export interface RevisionItem {
  id: string;
  concept_id: string;
  revision_type: string;
  priority: number;
  next_review_at: string | null;
  overdue?: boolean;
  concept: RevisionConcept | null;
}

export interface MemoryHealth {
  total: number;
  strong: number;
  stable: number;
  weak: number;
  strong_count: number;
  stable_count: number;
  weak_count: number;
}

export interface RevisionDashboardData {
  due_now:       RevisionItem[];
  coming_up:     RevisionItem[];
  radar:         RevisionItem[];
  memory_health: MemoryHealth;
}
