import { RevisionService } from "../services/revision.service.js";
import { getEventBus } from "./event-bus.js";

let _revisionService: RevisionService | null = null;

export function getRevisionService(): RevisionService {
  if (!_revisionService) {
    _revisionService = new RevisionService(getEventBus());
  }
  return _revisionService;
}
