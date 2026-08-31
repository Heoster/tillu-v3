import { v4 as uuidv4 } from "uuid";
import type { TilluEvent, EventTypeName } from "@tillu/schemas";
import { TilluEventSchema } from "@tillu/schemas";
import { DatabaseError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";

const logger = createLogger({ service: "event_bus" });

export interface EmitOptions {
  correlation_id?: string;
  trace_id?: string;
  source?: string;
}

/**
 * EventBus
 *
 * Writes append-only events to the Supabase events table.
 * All events are idempotent — processing the same event_id twice is safe.
 *
 * Accepts a Supabase-compatible DB client for testability (inject a mock in tests).
 */
export class EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  /**
   * Emit a Tillu event — inserts an append-only record.
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
      source: options.source ?? "tillu_core",
      actor_id: actorId,
      correlation_id: options.correlation_id ?? uuidv4(),
      trace_id: options.trace_id ?? uuidv4(),
      timestamp: new Date().toISOString(),
      payload,
    };

    // Validate the envelope before writing
    const parsed = TilluEventSchema.safeParse(event);
    if (!parsed.success) {
      logger.error("event_bus.invalid_envelope", {
        event_type: eventType,
        errors: parsed.error.flatten(),
      });
      throw new DatabaseError("Event envelope validation failed", {
        errors: parsed.error.flatten(),
      });
    }

    const { error } = await this.db.from("events").insert({
      id: event.id,
      event_type: event.event_type,
      schema_version: event.schema_version,
      source: event.source,
      actor_id: event.actor_id,
      correlation_id: event.correlation_id,
      trace_id: event.trace_id,
      payload: event.payload,
      status: "pending",
      retry_count: 0,
      created_at: event.timestamp,
    });

    if (error) {
      logger.error("event_bus.emit_failed", {
        event_type: eventType,
        actor_id: actorId,
        error: error.message,
      });
      throw new DatabaseError("Failed to emit event", { error: error.message });
    }

    logger.info("event_bus.emitted", {
      event_id: event.id,
      event_type: eventType,
      actor_id: actorId,
    });

    return event.id;
  }

  /**
   * Check whether a consumer has already processed a given event.
   * Call this before processing any event to ensure idempotency.
   */
  async isProcessed(eventId: string, consumerId: string): Promise<boolean> {
    const { data } = await this.db
      .from("event_consumer_log")
      .select("event_id")
      .eq("event_id", eventId)
      .eq("consumer_id", consumerId)
      .single();

    return !!data;
  }

  /**
   * Mark an event as processed by this consumer.
   * Call this after successfully completing event processing.
   */
  async markProcessed(eventId: string, consumerId: string): Promise<void> {
    const { error } = await this.db.from("event_consumer_log").insert({
      event_id: eventId,
      consumer_id: consumerId,
    });

    // Ignore unique constraint violations (already processed is fine)
    if (error && !error.message.includes("unique") && !error.message.includes("duplicate")) {
      throw new DatabaseError("Failed to mark event as processed", { error: error.message });
    }
  }
}
