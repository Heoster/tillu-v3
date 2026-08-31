/**
 * EventBus singleton for the API process.
 * Injects the Supabase service client into EventBus once at startup.
 * All services import getEventBus() rather than constructing EventBus directly.
 */

import { EventBus } from "@tillu/events";
import { getServiceClient } from "@tillu/database";

let _eventBus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!_eventBus) {
    _eventBus = new EventBus(getServiceClient());
  }
  return _eventBus;
}
