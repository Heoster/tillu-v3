/**
 * @tillu/events
 *
 * EventBus and event utilities for the Tillu system.
 *
 * Rules:
 * - All event emissions go through EventBus.emit().
 * - All event consumers check idempotency before processing.
 * - The events table in Supabase is append-only — no deletes or updates.
 */

export { EventBus } from "./event-bus.js";
export type { EmitOptions } from "./event-bus.js";
export { EventType } from "@tillu/schemas";
export type { TilluEvent, EventTypeName } from "@tillu/schemas";
