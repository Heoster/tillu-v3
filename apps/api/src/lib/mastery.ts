/**
 * MasteryService singleton for the API process.
 * Injects EventBus once at startup.
 */
import { MasteryService } from "../services/mastery.service.js";
import { getEventBus } from "./event-bus.js";

let _masteryService: MasteryService | null = null;

export function getMasteryService(): MasteryService {
  if (!_masteryService) {
    _masteryService = new MasteryService(getEventBus());
  }
  return _masteryService;
}
