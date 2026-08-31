import { z } from "zod";

/** UUID v4 string */
export const UuidSchema = z.string().uuid();

/** ISO-8601 datetime string */
export const IsoDateTimeSchema = z.string().datetime();

/** Mastery score 0–100 */
export const MasteryScoreSchema = z.number().min(0).max(100);

/** Confidence 0–1 (never exactly 1 for inferred values) */
export const ConfidenceSchema = z.number().min(0).max(1);

/** Priority levels */
export const PrioritySchema = z.enum(["critical", "high", "normal", "low", "optional"]);

/** Task status state machine */
export const TaskStatusSchema = z.enum([
  "planned",
  "ready",
  "active",
  "completed",
  "skipped",
  "postponed",
  "expired",
  "cancelled",
]);

/** Error types for student mistakes */
export const ErrorTypeSchema = z.enum([
  "conceptual",
  "formula",
  "calculation",
  "sign",
  "unit",
  "carelessness",
  "misreading",
  "memory",
  "time_pressure",
  "presentation",
]);

/** Presence states */
export const PresenceStateSchema = z.enum([
  "UNKNOWN",
  "AVAILABLE",
  "STUDYING",
  "AWAY",
  "SLEEPING",
  "OFFLINE",
]);

/** Research confidence levels */
export const ResearchConfidenceSchema = z.enum([
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNVERIFIED",
]);

/** Agent health status */
export const AgentHealthStatusSchema = z.enum([
  "healthy",
  "degraded",
  "failing",
  "down",
  "unknown",
]);

/** Revision types */
export const RevisionTypeSchema = z.enum([
  "recall",
  "formula",
  "reaction",
  "flashcard",
  "concept_explanation",
  "question",
  "pyq",
  "mixed",
]);

/** Quiz modes */
export const QuizModeSchema = z.enum([
  "daily",
  "quick",
  "revision",
  "weakness",
  "mixed",
  "pyq",
  "exam_sim",
]);

/** Quota guardian modes */
export const QuotaModeSchema = z.enum(["NORMAL", "CONSERVE", "EMERGENCY"]);

// Inferred types
export type Uuid = z.infer<typeof UuidSchema>;
export type MasteryScore = z.infer<typeof MasteryScoreSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type ErrorType = z.infer<typeof ErrorTypeSchema>;
export type PresenceState = z.infer<typeof PresenceStateSchema>;
export type ResearchConfidence = z.infer<typeof ResearchConfidenceSchema>;
export type AgentHealthStatus = z.infer<typeof AgentHealthStatusSchema>;
export type RevisionType = z.infer<typeof RevisionTypeSchema>;
export type QuizMode = z.infer<typeof QuizModeSchema>;
export type QuotaMode = z.infer<typeof QuotaModeSchema>;
