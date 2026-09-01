/**
 * DomainGuard
 *
 * Enforces the approved domain allowlist for all Chromium navigation.
 * The local agent must NEVER navigate to a domain not in the allowlist.
 *
 * This is a security boundary — any attempt to navigate outside approved
 * domains must be blocked, logged, and trigger an EMERGENCY_STOP.
 */

import { config } from "./config.js";

export class DomainGuard {
  private readonly allowed: Set<string>;

  constructor(allowedDomains?: string[]) {
    const domains = allowedDomains ?? config.allowedDomains;
    this.allowed  = new Set(domains.map((d) => d.toLowerCase()));
  }

  /**
   * Check if a URL is allowed for navigation.
   * Returns true if the URL's hostname matches an approved domain.
   */
  isAllowed(url: string): boolean {
    try {
      const { hostname } = new URL(url);
      const normalised   = hostname.toLowerCase();

      for (const domain of this.allowed) {
        if (normalised === domain || normalised.endsWith(`.${domain}`)) {
          return true;
        }
      }
      return false;
    } catch {
      // Malformed URL — not allowed
      return false;
    }
  }

  /**
   * Assert that a URL is allowed. Throws if not.
   */
  assertAllowed(url: string): void {
    if (!this.isAllowed(url)) {
      throw new Error(
        `DomainGuard: navigation to "${url}" blocked. ` +
        `Allowed domains: ${[...this.allowed].join(", ")}`
      );
    }
  }

  getAllowedDomains(): string[] {
    return [...this.allowed];
  }
}
