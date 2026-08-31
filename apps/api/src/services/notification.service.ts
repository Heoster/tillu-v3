/**
 * NotificationService
 *
 * Intelligent notification pipeline:
 *   event → importance check → presence check → quiet hours check
 *   → deduplication → send / queue / suppress
 *
 * Design rules:
 * - Never spam. One notification per dedupe_key per day unless critical.
 * - Respect quiet hours and student presence state.
 * - Critical notifications bypass quiet hours (exam tomorrow, critical failure).
 * - NOTIF_SENT event emitted for every notification that reaches "sent" status.
 * - Duplicate notifications are suppressed silently (no error).
 */

import { getServiceClient } from "@tillu/database";
import { TilluError, ValidationError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { EventBus } from "@tillu/events";
import { EventType } from "@tillu/schemas";
import { z } from "zod";

const logger = createLogger({ service: "notification_service" });

// ── Schemas ───────────────────────────────────────────────────────────────────

export const NotificationPrioritySchema = z.enum(["critical", "high", "normal", "low"]);
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

export const SendNotificationSchema = z.object({
  student_id:        z.string().uuid(),
  notification_type: z.string().min(1),
  priority:          NotificationPrioritySchema.default("normal"),
  title:             z.string().min(1).max(100),
  body:              z.string().min(1).max(500),
  /** Composite dedupe key — same key on same day = suppressed */
  dedupe_key:        z.string().min(1),
  /** Override quiet hours (only respected for priority = critical) */
  force:             z.boolean().default(false),
});

export type SendNotificationInput = z.infer<typeof SendNotificationSchema>;

export type NotificationDecision = "sent" | "suppressed" | "queued" | "blocked_presence" | "blocked_quiet_hours" | "duplicate";

export interface NotificationResult {
  decision:        NotificationDecision;
  notification_id: string | null;
  reason:          string;
}

// ── Presence state type ───────────────────────────────────────────────────────

type PresenceState = "UNKNOWN" | "AVAILABLE" | "STUDYING" | "AWAY" | "SLEEPING" | "OFFLINE";

/** Which presence states allow which priority levels */
const PRESENCE_POLICY: Record<PresenceState, NotificationPriority[]> = {
  UNKNOWN:   ["critical", "high"],
  AVAILABLE: ["critical", "high", "normal", "low"],
  STUDYING:  ["critical"],                       // don't interrupt studying
  AWAY:      ["critical", "high"],
  SLEEPING:  ["critical"],                       // only critical during sleep
  OFFLINE:   ["critical", "high"],               // queue for when they return
};

/** Priorities that bypass quiet hours */
const BYPASS_QUIET_HOURS: NotificationPriority[] = ["critical"];

// ── Service ───────────────────────────────────────────────────────────────────

export class NotificationService {
  constructor(private readonly eventBus: EventBus) {}

  /**
   * Send a notification through the full pipeline.
   * Returns the decision and notification id (if created).
   */
  async send(input: SendNotificationInput): Promise<NotificationResult> {
    const parsed = SendNotificationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid notification input", { errors: parsed.error.flatten() });
    }

    const { student_id, notification_type, priority, title, body, dedupe_key, force } = parsed.data;
    const db = getServiceClient();

    // ── Step 1: Deduplication check ──────────────────────────────────────────
    const { data: existing } = await db
      .from("notifications")
      .select("id, status")
      .eq("student_id", student_id)
      .eq("dedupe_key", dedupe_key)
      .single();

    if (existing) {
      logger.info("notification.suppressed.duplicate", {
        student_id,
        notification_type,
        dedupe_key,
      });
      return { decision: "duplicate", notification_id: existing.id, reason: "Duplicate notification suppressed" };
    }

    // ── Step 2: Presence check ───────────────────────────────────────────────
    const presenceState = await this.getPresenceState(student_id);
    const allowedPriorities = PRESENCE_POLICY[presenceState];

    if (!force && !allowedPriorities.includes(priority)) {
      // Queue for later delivery when presence allows it
      const decision = presenceState === "SLEEPING" || presenceState === "STUDYING" ? "queued" : "blocked_presence";

      const { data: queued } = await db
        .from("notifications")
        .insert({ student_id, notification_type, priority, title, body, dedupe_key, status: "queued" })
        .select("id")
        .single();

      logger.info("notification.queued", { student_id, notification_type, priority, presence: presenceState });
      return { decision, notification_id: queued?.id ?? null, reason: `Queued — student is ${presenceState}` };
    }

    // ── Step 3: Quiet hours check ─────────────────────────────────────────────
    if (!force && !BYPASS_QUIET_HOURS.includes(priority)) {
      const inQuietHours = await this.isInQuietHours(student_id);
      if (inQuietHours) {
        const { data: queued } = await db
          .from("notifications")
          .insert({ student_id, notification_type, priority, title, body, dedupe_key, status: "queued" })
          .select("id")
          .single();

        logger.info("notification.queued.quiet_hours", { student_id, notification_type });
        return { decision: "queued", notification_id: queued?.id ?? null, reason: "Queued — quiet hours active" };
      }
    }

    // ── Step 4: Send ─────────────────────────────────────────────────────────
    const { data: notification, error } = await db
      .from("notifications")
      .insert({
        student_id,
        notification_type,
        priority,
        title,
        body,
        dedupe_key,
        status:  "sent",
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !notification) {
      throw new TilluError(error?.message ?? "Failed to create notification", "DATABASE_ERROR", true);
    }

    // Emit NOTIFICATION_SENT
    await this.eventBus
      .emit(
        EventType.NOTIFICATION_SENT,
        student_id,
        { notification_id: notification.id, notification_type, priority, title },
        { source: "notification_service" }
      )
      .catch((err: unknown) => {
        logger.warn("notification.event_emit_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      });

    logger.info("notification.sent", { student_id, notification_type, priority, notification_id: notification.id });

    return { decision: "sent", notification_id: notification.id, reason: "Notification sent" };
  }

  /**
   * Helper: Send notification for a specific Tillu event type with predefined template.
   * Manages dedupe_key automatically using event + student + date.
   */
  async sendForEvent(
    studentId: string,
    eventType: string,
    data: {
      title: string;
      body: string;
      priority?: NotificationPriority;
      entityId?: string;
    }
  ): Promise<NotificationResult> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dedupe_key = `${eventType}:${data.entityId ?? "global"}:${today}`;

    return this.send({
      student_id:        studentId,
      notification_type: eventType,
      priority:          data.priority ?? "normal",
      title:             data.title,
      body:              data.body,
      dedupe_key,
    });
  }

  /**
   * Get pending (queued) notifications — to be delivered when presence changes.
   */
  async getQueuedNotifications(studentId: string, limit = 20) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("notifications")
      .select("*")
      .eq("student_id", studentId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
    return data ?? [];
  }

  /**
   * Flush queued notifications when a student becomes AVAILABLE.
   * Called when presence transitions to AVAILABLE.
   */
  async flushQueued(studentId: string): Promise<number> {
    const queued = await this.getQueuedNotifications(studentId, 10);
    let flushed = 0;

    for (const notif of queued) {
      const result = await this.send({
        student_id:        studentId,
        notification_type: notif.notification_type,
        priority:          notif.priority as NotificationPriority,
        title:             notif.title,
        body:              notif.body,
        dedupe_key:        notif.dedupe_key + ":flushed",
        force:             notif.priority === "critical",
      });

      if (result.decision === "sent") {
        // Mark original as suppressed
        const db = getServiceClient();
        await db
          .from("notifications")
          .update({ status: "suppressed" })
          .eq("id", notif.id);
        flushed++;
      }
    }

    return flushed;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async getPresenceState(studentId: string): Promise<PresenceState> {
    const db = getServiceClient();
    const { data } = await db
      .from("presence_state")
      .select("state")
      .eq("student_id", studentId)
      .single();

    return (data?.state ?? "UNKNOWN") as PresenceState;
  }

  private async isInQuietHours(studentId: string): Promise<boolean> {
    const db = getServiceClient();

    // Get sleep preferences
    const { data: prefs } = await db
      .from("student_preferences")
      .select("key, value")
      .eq("student_id", studentId)
      .in("key", ["sleep_start", "sleep_end"]);

    const prefMap: Record<string, string> = {};
    for (const p of prefs ?? []) {
      prefMap[p.key] = p.value;
    }

    const sleepStart = prefMap["sleep_start"] ?? "23:00";
    const sleepEnd   = prefMap["sleep_end"]   ?? "06:30";

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Handle overnight quiet hours (e.g. 23:00 → 06:30)
    if (sleepStart > sleepEnd) {
      return currentTime >= sleepStart || currentTime <= sleepEnd;
    }
    // Same-day quiet hours (e.g. 22:00 → 23:30)
    return currentTime >= sleepStart && currentTime <= sleepEnd;
  }
}
