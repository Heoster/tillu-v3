import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";

/**
 * Authenticated app shell.
 *
 * Desktop (lg+):  3 zones — Left Nav | Workspace | Tillu Sidebar
 * Tablet (md):    2 zones — Workspace | Tillu Sidebar (nav collapses)
 * Mobile (<md):   Full workspace + Bottom Nav + Floating Tillu button
 *
 * UI spec §2 — Global UI Shell
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch student name for greeting
  const { data: profile } = await supabase
    .from("student_profiles")
    .select("name")
    .eq("user_id", user.id)
    .single();

  return (
    <AppShell studentName={profile?.name ?? null}>
      {children}
    </AppShell>
  );
}
