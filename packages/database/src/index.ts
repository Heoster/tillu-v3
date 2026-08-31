/**
 * @tillu/database
 *
 * Supabase client factory and typed query helpers.
 *
 * Rules:
 * - getServiceClient() is for server-side (API, agents) only.
 * - createAnonClient() is for browser (web app) only.
 * - All DB access in services goes through this package.
 * - Never import @supabase/supabase-js directly in apps/agents.
 */

export { createAnonClient, createServiceClient, getServiceClient } from "./client.js";
export type { Database, StudentProfile, StudentPreference, Subject, Chapter, Concept,
  StudySession, StudyTask, TilluEventRow, MasteryState, RevisionItem, Notification
} from "./types.js";
