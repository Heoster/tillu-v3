import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";

/**
 * Standard event envelope.
 * Every event emitted by any service must use this schema.
 */
export const TilluEventSchema = z.object({
  id: UuidSchema,
  event_type: z.string().min(1),
  schema_version: z.string().default("v1"),
  source: z.string().min(1),
  actor_id: UuidSchema,
  correlation_id: UuidSchema,
  trace_id: UuidSchema,
  timestamp: IsoDateTimeSchema,
  payload: z.record(z.unknown()),
});

export type TilluEvent = z.infer<typeof TilluEventSchema>;

/**
 * All valid event types in the Tillu system.
 * Add new event types here — never use raw strings elsewhere.
 */
export const EventType = {
  // Auth
  USER_REGISTERED: "USER_REGISTERED",

  // Profile
  PROFILE_CREATED: "PROFILE_CREATED",
  PROFILE_UPDATED: "PROFILE_UPDATED",

  // Study sessions
  SESSION_STARTED: "SESSION_STARTED",
  SESSION_PAUSED: "SESSION_PAUSED",
  SESSION_RESUMED: "SESSION_RESUMED",
  SESSION_COMPLETED: "SESSION_COMPLETED",
  SESSION_ABANDONED: "SESSION_ABANDONED",

  // Mastery
  MASTERY_UPDATED: "MASTERY_UPDATED",
  MASTERY_DEGRADED: "MASTERY_DEGRADED",

  // Revision
  REVISION_SCHEDULED: "REVISION_SCHEDULED",
  REVISION_DUE: "REVISION_DUE",
  REVISION_COMPLETED: "REVISION_COMPLETED",
  REVISION_FAILED: "REVISION_FAILED",
  REVISION_RESCHEDULED: "REVISION_RESCHEDULED",

  // Mistakes
  MISTAKE_CREATED: "MISTAKE_CREATED",
  MISTAKE_PATTERN_DETECTED: "MISTAKE_PATTERN_DETECTED",
  REPAIR_STARTED: "REPAIR_STARTED",
  REPAIR_COMPLETED: "REPAIR_COMPLETED",

  // Lectures
  LECTURE_STARTED: "LECTURE_STARTED",
  LECTURE_PROGRESS_UPDATED: "LECTURE_PROGRESS_UPDATED",
  LECTURE_COMPLETED: "LECTURE_COMPLETED",
  LECTURE_ABANDONED: "LECTURE_ABANDONED",

  // Quizzes
  QUIZ_CREATED: "QUIZ_CREATED",
  QUIZ_STARTED: "QUIZ_STARTED",
  QUESTION_ATTEMPTED: "QUESTION_ATTEMPTED",
  QUESTION_CORRECT: "QUESTION_CORRECT",
  QUESTION_INCORRECT: "QUESTION_INCORRECT",
  QUIZ_COMPLETED: "QUIZ_COMPLETED",

  // Planning
  PLAN_CREATED: "PLAN_CREATED",
  PLAN_CHANGED: "PLAN_CHANGED",
  PLAN_RECOVERED: "PLAN_RECOVERED",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_SKIPPED: "TASK_SKIPPED",
  TASK_POSTPONED: "TASK_POSTPONED",

  // System
  PRESENCE_CHANGED: "PRESENCE_CHANGED",
  AGENT_HEALTH_CHANGED: "AGENT_HEALTH_CHANGED",
  AGENT_FAILURE: "AGENT_FAILURE",
  AGENT_RECOVERED: "AGENT_RECOVERED",
  QUOTA_THRESHOLD_REACHED: "QUOTA_THRESHOLD_REACHED",
  NOTIFICATION_SENT: "NOTIFICATION_SENT",
  NOTIFICATION_SUPPRESSED: "NOTIFICATION_SUPPRESSED",
} as const;

export type EventTypeName = (typeof EventType)[keyof typeof EventType];
