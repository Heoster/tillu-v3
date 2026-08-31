/**
 * Supabase Database type definitions.
 * These mirror the actual database schema and are used for typed queries.
 *
 * Phase 1: covers the tables created in migrations 0001 and 0002.
 * Update this file whenever a new migration adds tables or columns.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      // ── Identity ─────────────────────────────────────────────────
      student_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          class: string;
          board: string;
          exam_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          class?: string;
          board?: string;
          exam_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          class?: string;
          board?: string;
          exam_date?: string | null;
          updated_at?: string;
        };
      };

      student_preferences: {
        Row: {
          id: string;
          student_id: string;
          key: string;
          value: string;
          source: "configured" | "observed" | "inferred";
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          key: string;
          value: string;
          source?: "configured" | "observed" | "inferred";
          updated_at?: string;
        };
        Update: {
          value?: string;
          source?: "configured" | "observed" | "inferred";
          updated_at?: string;
        };
      };

      // ── Academic Graph ────────────────────────────────────────────
      subjects: {
        Row: {
          id: string;
          name: string;
          code: string;
          board: string;
          class: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          board?: string;
          class?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };

      chapters: {
        Row: {
          id: string;
          subject_id: string;
          name: string;
          unit: string | null;
          sequence: number;
          importance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          name: string;
          unit?: string | null;
          sequence?: number;
          importance?: number;
          created_at?: string;
        };
        Update: Record<string, never>;
      };

      concepts: {
        Row: {
          id: string;
          chapter_id: string;
          name: string;
          description: string | null;
          importance: number;
          prerequisites: Json;
          related: Json;
          source: string;
          source_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          name: string;
          description?: string | null;
          importance?: number;
          prerequisites?: Json;
          related?: Json;
          source?: string;
          source_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          description?: string | null;
          importance?: number;
          updated_at?: string;
        };
      };

      // ── Study ─────────────────────────────────────────────────────
      study_sessions: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string | null;
          chapter_id: string | null;
          concept_id: string | null;
          activity_type: string;
          status: string;
          planned_duration_min: number | null;
          actual_duration_min: number | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id?: string | null;
          chapter_id?: string | null;
          concept_id?: string | null;
          activity_type: string;
          status?: string;
          planned_duration_min?: number | null;
          actual_duration_min?: number | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          actual_duration_min?: number | null;
          ended_at?: string | null;
        };
      };

      study_tasks: {
        Row: {
          id: string;
          session_id: string;
          concept_id: string | null;
          task_type: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          concept_id?: string | null;
          task_type: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
      };

      // ── Events ────────────────────────────────────────────────────
      events: {
        Row: {
          id: string;
          event_type: string;
          schema_version: string;
          source: string;
          actor_id: string;
          correlation_id: string;
          trace_id: string;
          payload: Json;
          status: string;
          retry_count: number;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          schema_version?: string;
          source: string;
          actor_id: string;
          correlation_id: string;
          trace_id: string;
          payload?: Json;
          status?: string;
          retry_count?: number;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          retry_count?: number;
          processed_at?: string | null;
        };
      };

      event_consumer_log: {
        Row: {
          event_id: string;
          consumer_id: string;
          processed_at: string;
        };
        Insert: {
          event_id: string;
          consumer_id: string;
          processed_at?: string;
        };
        Update: Record<string, never>;
      };

      // ── Agents ────────────────────────────────────────────────────
      agents: {
        Row: {
          id: string;
          name: string;
          version: string;
          endpoint: string | null;
          host_provider: string | null;
          enabled: boolean;
          priority: number;
          capabilities: Json;
          health_status: string;
          health_score: number | null;
          last_heartbeat_at: string | null;
          last_success_at: string | null;
          last_failure_at: string | null;
          failure_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          version: string;
          endpoint?: string | null;
          host_provider?: string | null;
          enabled?: boolean;
          priority?: number;
          capabilities?: Json;
          health_status?: string;
          health_score?: number | null;
          last_heartbeat_at?: string | null;
          last_success_at?: string | null;
          last_failure_at?: string | null;
          failure_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          version?: string;
          endpoint?: string | null;
          enabled?: boolean;
          health_status?: string;
          health_score?: number | null;
          last_heartbeat_at?: string | null;
          last_success_at?: string | null;
          last_failure_at?: string | null;
          failure_count?: number;
          updated_at?: string;
        };
      };

      // ── Mastery (Phase 2 — columns defined, populated later) ──────
      mastery_states: {
        Row: {
          id: string;
          student_id: string;
          concept_id: string;
          mastery_score: number;
          confidence: number;
          recall_score: number;
          practice_score: number;
          pyq_score: number;
          exam_score: number;
          attempt_count: number;
          success_count: number;
          failure_count: number;
          last_attempt_at: string | null;
          last_success_at: string | null;
          last_failure_at: string | null;
          forgetting_risk: number;
          next_review_at: string | null;
          mastery_algorithm_version: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          concept_id: string;
          mastery_score?: number;
          confidence?: number;
          recall_score?: number;
          practice_score?: number;
          pyq_score?: number;
          exam_score?: number;
          attempt_count?: number;
          success_count?: number;
          failure_count?: number;
          last_attempt_at?: string | null;
          last_success_at?: string | null;
          last_failure_at?: string | null;
          forgetting_risk?: number;
          next_review_at?: string | null;
          mastery_algorithm_version?: string;
          updated_at?: string;
        };
        Update: {
          mastery_score?: number;
          confidence?: number;
          recall_score?: number;
          practice_score?: number;
          pyq_score?: number;
          exam_score?: number;
          attempt_count?: number;
          success_count?: number;
          failure_count?: number;
          last_attempt_at?: string | null;
          last_success_at?: string | null;
          last_failure_at?: string | null;
          forgetting_risk?: number;
          next_review_at?: string | null;
          updated_at?: string;
        };
      };

      // ── Revision (Phase 3 — columns defined, populated later) ─────
      revision_items: {
        Row: {
          id: string;
          student_id: string;
          concept_id: string;
          revision_type: string;
          priority: number;
          difficulty: number;
          stability: number;
          last_review_at: string | null;
          next_review_at: string | null;
          attempt_count: number;
          success_count: number;
          failure_count: number;
          status: string;
          revision_algorithm_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          concept_id: string;
          revision_type?: string;
          priority?: number;
          difficulty?: number;
          stability?: number;
          last_review_at?: string | null;
          next_review_at?: string | null;
          attempt_count?: number;
          success_count?: number;
          failure_count?: number;
          status?: string;
          revision_algorithm_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          priority?: number;
          difficulty?: number;
          stability?: number;
          last_review_at?: string | null;
          next_review_at?: string | null;
          attempt_count?: number;
          success_count?: number;
          failure_count?: number;
          status?: string;
          updated_at?: string;
        };
      };

      // ── Notifications (Phase 3) ────────────────────────────────────
      notifications: {
        Row: {
          id: string;
          student_id: string;
          notification_type: string;
          priority: string;
          title: string;
          body: string;
          dedupe_key: string;
          status: string;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          notification_type: string;
          priority?: string;
          title: string;
          body: string;
          dedupe_key: string;
          status?: string;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          sent_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience row types
export type StudentProfile = Database["public"]["Tables"]["student_profiles"]["Row"];
export type StudentPreference = Database["public"]["Tables"]["student_preferences"]["Row"];
export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type Concept = Database["public"]["Tables"]["concepts"]["Row"];
export type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];
export type StudyTask = Database["public"]["Tables"]["study_tasks"]["Row"];
export type TilluEventRow = Database["public"]["Tables"]["events"]["Row"];
export type MasteryState = Database["public"]["Tables"]["mastery_states"]["Row"];
export type RevisionItem = Database["public"]["Tables"]["revision_items"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
