import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MistakeBank } from "@/components/mistakes/MistakeBank";

/**
 * Mistake Bank page — groups mistakes by concept with top error type.
 * Live data from GET /mistakes/bank.
 * Phase 4: view + repair sessions.
 * Phase 5+: retry questions directly in the UI.
 */
export default async function MistakesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token ?? "";

  let bankData: MistakeBankEntry[] = [];
  let patterns: MistakePattern[]   = [];

  if (token) {
    const apiBase = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";

    const [bankRes, patternsRes] = await Promise.allSettled([
      fetch(`${apiBase}/mistakes/bank`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 120 },
      }).then((r) => (r.ok ? r.json() as Promise<MistakeBankEntry[]> : [])),

      fetch(`${apiBase}/mistakes/patterns`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 120 },
      }).then((r) => (r.ok ? r.json() as Promise<MistakePattern[]> : [])),
    ]);

    bankData = bankRes.status === "fulfilled" ? (bankRes.value as MistakeBankEntry[]) : [];
    patterns = patternsRes.status === "fulfilled" ? (patternsRes.value as MistakePattern[]) : [];
  }

  return <MistakeBank bank={bankData} patterns={patterns} />;
}

// ── Shared types ──────────────────────────────────────────────────────────────

export interface MistakeBankEntry {
  concept_id:   string;
  concept_name: string;
  subject_code: string;
  chapter_name: string;
  total:        number;
  unresolved:   number;
  top_error:    string;
  error_types:  Record<string, number>;
}

export interface MistakePattern {
  id:           string;
  concept_id:   string;
  error_type:   string;
  frequency:    number;
  severity:     "low" | "medium" | "high";
  status:       "active" | "resolved";
  first_seen_at: string;
  last_seen_at:  string;
  concepts?: {
    name: string;
    chapters?: { name: string; subjects?: { code: string } };
  };
}
