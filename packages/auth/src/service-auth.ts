import { AuthorizationError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";

const logger = createLogger({ service: "service_auth" });

/**
 * Verify an internal service-to-service token.
 * Agents send X-Agent-Secret: <AGENT_SECRET> in their requests to the API.
 *
 * This is intentionally simple for Phase 1.
 * Phase 3: upgrade to short-lived signed tokens with expiry.
 */
export function verifyServiceToken(secretHeader: string | undefined): void {
  const expected = process.env["AGENT_SECRET"];

  if (!expected) {
    logger.error("AGENT_SECRET environment variable not set");
    throw new AuthorizationError("Service auth not configured");
  }

  if (!secretHeader || secretHeader !== expected) {
    throw new AuthorizationError("Invalid service token");
  }
}

/**
 * Generate a service token for outgoing agent requests.
 * Phase 1: returns the shared secret. Phase 3: will generate a signed JWT.
 */
export function generateServiceToken(): string {
  const secret = process.env["AGENT_SECRET"];
  if (!secret) {
    throw new Error("AGENT_SECRET not configured");
  }
  return secret;
}
