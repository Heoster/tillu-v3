import { MistakeService } from "../services/mistake.service.js";
import { getEventBus } from "./event-bus.js";

let _mistakeService: MistakeService | null = null;

export function getMistakeService(): MistakeService {
  if (!_mistakeService) {
    _mistakeService = new MistakeService(getEventBus());
  }
  return _mistakeService;
}
