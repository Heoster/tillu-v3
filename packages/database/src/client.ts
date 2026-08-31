import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.js";
import { DatabaseError } from "@tillu/utilities";

/**
 * Create a Supabase client using the ANON key.
 * Used in apps/web (browser) for authenticated user requests.
 * RLS is enforced — each user only sees their own data.
 */
export function createAnonClient(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_ANON_KEY"] ?? process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url || !key) {
    throw new DatabaseError(
      "SUPABASE_URL and SUPABASE_ANON_KEY must be set",
      { hint: "Check your .env file against docs/ENV_SPEC.md" }
    );
  }

  return createClient<Database>(url, key);
}

/**
 * Create a Supabase client using the SERVICE ROLE key.
 * Used in apps/api and agents (server-side only).
 * Bypasses RLS — use only for authorized server operations.
 * NEVER expose this client or its key to the browser.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    throw new DatabaseError(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for server-side operations",
      { hint: "These are server-only variables — never set NEXT_PUBLIC_ versions" }
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Singleton instances — created once per process
let _serviceClient: SupabaseClient<Database> | null = null;

export function getServiceClient(): SupabaseClient<Database> {
  if (!_serviceClient) {
    _serviceClient = createServiceClient();
  }
  return _serviceClient;
}
