import { PresenceService } from "../services/presence.service.js";
import { getEventBus } from "./event-bus.js";

let _presenceService: PresenceService | null = null;

export function getPresenceService(): PresenceService {
  if (!_presenceService) {
    _presenceService = new PresenceService(getEventBus());
  }
  return _presenceService;
}
