import { LectureService } from "../services/lecture.service.js";
import { getEventBus } from "./event-bus.js";

let _lectureService: LectureService | null = null;

export function getLectureService(): LectureService {
  if (!_lectureService) {
    _lectureService = new LectureService(getEventBus());
  }
  return _lectureService;
}
