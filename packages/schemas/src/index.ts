/**
 * @tillu/schemas
 *
 * Central Zod schema library for Tillu.
 * All API inputs, AI outputs, and events are validated against schemas defined here.
 *
 * Rules:
 * - No schema may be defined inline in a route handler or agent — define it here.
 * - All AI output schemas must be used for validation before storing results.
 * - Breaking changes to schemas require a version bump in the consuming event/API.
 */

// Agent contract schemas
export * from "./agent.js";

// Event envelope schemas
export * from "./events.js";

// Common shared types
export * from "./common.js";
