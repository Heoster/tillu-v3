/**
 * @tillu/auth
 *
 * Authentication helpers for Tillu API and agents.
 *
 * Two token types in Tillu:
 *   1. Supabase JWT  — issued by Supabase Auth to the student browser
 *   2. Service token — internal API ↔ agent auth (shared secret in AGENT_SECRET)
 *
 * Never mix these two. verifyUserToken() is for user requests.
 * verifyServiceToken() is for agent-to-agent calls.
 */

export { verifyUserToken, extractUserId } from "./user-auth.js";
export { verifyServiceToken, generateServiceToken } from "./service-auth.js";
export type { AuthenticatedUser } from "./user-auth.js";
