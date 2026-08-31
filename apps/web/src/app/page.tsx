import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Root page — redirects based on auth state.
 * Authenticated → /home
 * Unauthenticated → /auth/login
 */
export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  } else {
    redirect("/auth/login");
  }
}
