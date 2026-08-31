import { createClient } from "@supabase/supabase-js";
import { AuthorizationError } from "@tillu/utilities";

export interface AuthenticatedUser {
  id: string;          // Supabase auth.users.id (uuid)
  email: string;
}

/**
 * Verify a Supabase JWT sent by the browser.
 * Returns the authenticated user or throws AuthorizationError.
 *
 * Uses Supabase's built-in token verification — no custom JWT secret needed.
 */
export async function verifyUserToken(authHeader: string | undefined): Promise<AuthenticatedUser> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthorizationError("Missing or malformed Authorization header");
  }

  const token = authHeader.slice(7);

  const url = process.env["SUPABASE_URL"];
  const anonKey = process.env["SUPABASE_ANON_KEY"];

  if (!url || !anonKey) {
    throw new AuthorizationError("Auth configuration missing");
  }

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AuthorizationError("Invalid or expired token");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? "",
  };
}

/**
 * Extract user ID from a verified Supabase JWT without full round-trip.
 * Only use this when you've already verified the token elsewhere in the request.
 */
export function extractUserId(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    // JWT payload is base64url encoded in the second segment
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")
    ) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
