import { SentinelService } from "../services/sentinel.service.js";
import { getEventBus } from "./event-bus.js";

let _sentinelService: SentinelService | null = null;

export function getSentinelService(): SentinelService {
  if (!_sentinelService) {
    _sentinelService = new SentinelService(getEventBus());
  }
  return _sentinelService;
}
