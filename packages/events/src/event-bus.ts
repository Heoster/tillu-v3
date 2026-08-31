import { v4 as uuidv4 } from "uuid";
import type { TilluEvent, EventTypeName } from "@tillu/schemas";

export interface EmitOptions {
  correlation_id?: string;
  trace_id?: string;
}

/**
 * EventBus
 *
 * Thin abstraction over the Supabase events table.
 * Accepts a Supabase client at construction time for testability.
 *
 * Phase 0: skeleton — full implementation in Phase 1.
 */
export class EventBus {
  // supabaseClient will be injected in Phase 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  /**
   * Emit a Tillu event.
   * Inserts an append-only record into the events table.
   * Returns the event id.
   */
  async emit<T extends Record<string, unknown>>(
    eventType: EventTypeName,
    actorId: string,
    payload: T,
    options: EmitOptions = {}
  ): Promise<string> {
    const event: TilluEvent = {
      id: uuidv4(),
      event_type: eventType,
      schema_version: "v1",
      source: "tillu_core",
      actor_id: actorId,
      correlation_id: options.correlation_id ?? uuidv4(),
      trace_id: options.trace_id ?? uuidv4(),
      timestamp: new Date().toISOString(),
      payload,
    };

    // Phase 1: implement actual Supabase insert
    // const { error } = await this.db.from("events").insert(event);
    // if (error) throw new TilluError("EVENT_EMIT_FAILED", error.message, true);

    return event.id;
  }

  /**
   * Check if an event has already been processed by a consumer.
   * Idempotency guard — call this before processing any event.
   *
   * Phase 1: implement with event_consumer_log table.
   */
  async isProcessed(
    _eventId: string,
    _consumerId: string
  ): Promise<boolean> {
    // Phase 1: implement real check
    return false;
  }

  /**
   * Mark an event as processed by a consumer.
   * Call this after successfully processing an event.
   */
  async markProcessed(
    _eventId: string,
    _consumerId: string
  ): Promise<void> {
    // Phase 1: implement real insert into event_consumer_log
  }
}
