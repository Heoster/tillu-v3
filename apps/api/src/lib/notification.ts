import { NotificationService } from "../services/notification.service.js";
import { getEventBus } from "./event-bus.js";

let _notificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!_notificationService) {
    _notificationService = new NotificationService(getEventBus());
  }
  return _notificationService;
}
