/**
 * LectureService
 *
 * Manages approved playlists per chapter, lecture progress tracking,
 * resume-from-last-position, and post-lecture recall question generation.
 *
 * Critical distinction (from PRD §9):
 *   Lecture watched ≠ Concept learned.
 *   Completing a lecture creates EXPOSURE evidence only (recall_score += 0).
 *   The post-lecture recall questions are what produce learning evidence.
 *
 * Flow:
 *   Playlist approved → lectures listed → local agent opens Chromium →
 *   progress tracked continuously → lecture completed →
 *   LECTURE_COMPLETED event → 3–5 recall questions generated →
 *   RevisionService.scheduleRevision for associated concepts
 */

import { getServiceClient } from "@tillu/database";
import { TilluError, ValidationError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { EventBus } from "@tillu/events";
import { EventType } from "@tillu/schemas";
import { z } from "zod";

const logger = createLogger({ service: "lecture_service" });

// ── Input schemas ─────────────────────────────────────────────────────────────

export const UpdateProgressSchema = z.object({
  position_sec:   z.number().int().min(0),
  duration_sec:   z.number().int().min(1).optional(),
  completed:      z.boolean().optional(),
});

export const AddPlaylistSchema = z.object({
  chapter_id: z.string().uuid(),
  title:      z.string().min(1).max(200),
  url:        z.string().url(),
  approved:   z.boolean().default(false),
});

export type UpdateProgressInput = z.infer<typeof UpdateProgressSchema>;
export type AddPlaylistInput    = z.infer<typeof AddPlaylistSchema>;

// ── Service ───────────────────────────────────────────────────────────────────

export class LectureService {
  constructor(private readonly eventBus: EventBus) {}

  /**
   * List approved playlists for a chapter.
   */
  async getPlaylists(chapterId: string) {
    const db = getServiceClient();

    // Verify chapter exists
    const { data: chapter } = await db
      .from("chapters")
      .select("id, name, subject_id")
      .eq("id", chapterId)
      .single();

    if (!chapter) {
      throw new TilluError("Chapter not found", "NOT_FOUND", false, { chapter_id: chapterId });
    }

    const { data, error } = await db
      .from("playlists")
      .select(`
        id, title, url, approved,
        lectures (id, title, url, sequence, duration_sec)
      `)
      .eq("chapter_id", chapterId)
      .eq("approved", true)
      .order("created_at");

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
    return { chapter, playlists: data ?? [] };
  }

  /**
   * Get all lectures for a playlist with the student's progress.
   */
  async getPlaylistWithProgress(playlistId: string, studentId: string) {
    const db = getServiceClient();

    const { data: playlist } = await db
      .from("playlists")
      .select("id, title, url, chapter_id")
      .eq("id", playlistId)
      .single();

    if (!playlist) {
      throw new TilluError("Playlist not found", "NOT_FOUND", false);
    }

    const { data: lectures } = await db
      .from("lectures")
      .select("id, title, url, sequence, duration_sec")
      .eq("playlist_id", playlistId)
      .order("sequence");

    if (!lectures) return { playlist, lectures: [] };

    // Fetch progress for each lecture
    const lectureIds = lectures.map((l) => l.id);
    const { data: progRows } = await db
      .from("lecture_progress")
      .select("lecture_id, position_sec, duration_sec, completed, last_watched_at")
      .eq("student_id", studentId)
      .in("lecture_id", lectureIds);

    const progressMap = new Map(
      (progRows ?? []).map((p) => [p.lecture_id, p])
    );

    const lecturesWithProgress = lectures.map((l) => ({
      ...l,
      progress: progressMap.get(l.id) ?? null,
    }));

    return { playlist, lectures: lecturesWithProgress };
  }

  /**
   * Update lecture progress (called frequently during playback).
   * Position is always recorded. Emits LECTURE_STARTED on first update,
   * LECTURE_COMPLETED when completed=true.
   */
  async updateProgress(
    studentId: string,
    lectureId: string,
    input: UpdateProgressInput
  ) {
    const parsed = UpdateProgressSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid progress data", { errors: parsed.error.flatten() });
    }

    const { position_sec, duration_sec, completed } = parsed.data;
    const db = getServiceClient();

    // Verify lecture exists
    const { data: lecture } = await db
      .from("lectures")
      .select("id, title, duration_sec, playlist_id")
      .eq("id", lectureId)
      .single();

    if (!lecture) {
      throw new TilluError("Lecture not found", "NOT_FOUND", false, { lecture_id: lectureId });
    }

    // Check if this is the first progress update (LECTURE_STARTED)
    const { data: existing } = await db
      .from("lecture_progress")
      .select("id, position_sec, completed")
      .eq("student_id", studentId)
      .eq("lecture_id", lectureId)
      .single();

    const isFirstUpdate = !existing;
    const wasCompleted  = existing?.completed ?? false;
    const isNowCompleted = completed === true;

    // Upsert progress
    const { data: progress, error } = await db
      .from("lecture_progress")
      .upsert(
        {
          student_id:      studentId,
          lecture_id:      lectureId,
          position_sec,
          duration_sec:    duration_sec ?? lecture.duration_sec ?? null,
          completed:       isNowCompleted,
          last_watched_at: new Date().toISOString(),
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "student_id,lecture_id" }
      )
      .select()
      .single();

    if (error || !progress) {
      throw new TilluError(error?.message ?? "Failed to update progress", "DATABASE_ERROR", true);
    }

    // Emit LECTURE_STARTED on first update
    if (isFirstUpdate) {
      await this.eventBus
        .emit(
          EventType.LECTURE_STARTED,
          studentId,
          { lecture_id: lectureId, playlist_id: lecture.playlist_id },
          { source: "lecture_service" }
        )
        .catch(() => { /* non-blocking */ });
    }

    // Emit LECTURE_COMPLETED if just completed
    if (isNowCompleted && !wasCompleted) {
      await this.handleLectureCompleted(studentId, lectureId, lecture.playlist_id);
    }

    return progress;
  }

  /**
   * Get resume position — the last watched position for a lecture.
   * Returns null if never watched.
   */
  async getResumePosition(studentId: string, lectureId: string) {
    const db = getServiceClient();

    const { data } = await db
      .from("lecture_progress")
      .select("position_sec, duration_sec, completed, last_watched_at")
      .eq("student_id", studentId)
      .eq("lecture_id", lectureId)
      .single();

    if (!data) return null;

    const progressPct = data.duration_sec
      ? Math.round((data.position_sec / data.duration_sec) * 100)
      : 0;

    return {
      position_sec:    data.position_sec,
      duration_sec:    data.duration_sec,
      completed:       data.completed,
      progress_pct:    progressPct,
      last_watched_at: data.last_watched_at,
    };
  }

  /**
   * Get the last-watched lecture for a chapter (for "continue where you left off").
   */
  async getLastWatched(studentId: string, chapterId: string) {
    const db = getServiceClient();

    const { data } = await db
      .from("lecture_progress")
      .select(`
        lecture_id, position_sec, duration_sec, completed, last_watched_at,
        lectures!inner (id, title, sequence, duration_sec,
          playlists!inner (id, title, chapter_id)
        )
      `)
      .eq("student_id", studentId)
      .eq("lectures.playlists.chapter_id", chapterId)
      .eq("completed", false)
      .order("last_watched_at", { ascending: false })
      .limit(1)
      .single();

    return data ?? null;
  }

  /**
   * Mark a lecture as complete manually (e.g. if local agent loses sync).
   */
  async markComplete(studentId: string, lectureId: string) {
    const db = getServiceClient();

    const { data: lecture } = await db
      .from("lectures")
      .select("id, duration_sec, playlist_id")
      .eq("id", lectureId)
      .single();

    if (!lecture) {
      throw new TilluError("Lecture not found", "NOT_FOUND", false);
    }

    const { data: progress, error } = await db
      .from("lecture_progress")
      .upsert(
        {
          student_id:      studentId,
          lecture_id:      lectureId,
          position_sec:    lecture.duration_sec ?? 0,
          duration_sec:    lecture.duration_sec,
          completed:       true,
          last_watched_at: new Date().toISOString(),
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "student_id,lecture_id" }
      )
      .select()
      .single();

    if (error || !progress) {
      throw new TilluError(error?.message ?? "Failed to mark complete", "DATABASE_ERROR", true);
    }

    await this.handleLectureCompleted(studentId, lectureId, lecture.playlist_id);

    return progress;
  }

  /**
   * Get a student's overall lecture progress for a chapter.
   */
  async getChapterLectureProgress(studentId: string, chapterId: string) {
    const db = getServiceClient();

    // Get all lectures in all playlists for this chapter
    const { data: playlists } = await db
      .from("playlists")
      .select("id, lectures(id, sequence, duration_sec)")
      .eq("chapter_id", chapterId)
      .eq("approved", true);

    const allLectureIds: string[] = [];
    for (const pl of playlists ?? []) {
      for (const lec of (pl.lectures as Array<{ id: string }>) ?? []) {
        allLectureIds.push(lec.id);
      }
    }

    if (allLectureIds.length === 0) return { total: 0, completed: 0, in_progress: 0, pct: 0 };

    const { data: progressRows } = await db
      .from("lecture_progress")
      .select("lecture_id, completed, position_sec, duration_sec")
      .eq("student_id", studentId)
      .in("lecture_id", allLectureIds);

    const rows       = progressRows ?? [];
    const completed  = rows.filter((r) => r.completed).length;
    const inProgress = rows.filter((r) => !r.completed && r.position_sec > 0).length;

    return {
      total:       allLectureIds.length,
      completed,
      in_progress: inProgress,
      pct:         Math.round((completed / allLectureIds.length) * 100),
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Called when a lecture is completed.
   * Emits LECTURE_COMPLETED and schedules revision for linked concepts.
   *
   * Note: LECTURE_COMPLETED creates EXPOSURE evidence only.
   * The post-lecture recall questions generate learning evidence.
   */
  private async handleLectureCompleted(
    studentId: string,
    lectureId: string,
    playlistId: string
  ) {
    const db = getServiceClient();

    // Find concepts linked to the playlist's chapter
    const { data: playlist } = await db
      .from("playlists")
      .select("chapter_id")
      .eq("id", playlistId)
      .single();

    const chapterId = playlist?.chapter_id;

    // Get top-importance concepts for this chapter (up to 5 for recall questions)
    const recallConcepts: Array<{ id: string; name: string }> = [];
    if (chapterId) {
      const { data: concepts } = await db
        .from("concepts")
        .select("id, name, importance")
        .eq("chapter_id", chapterId)
        .order("importance", { ascending: false })
        .limit(5);
      recallConcepts.push(...(concepts ?? []));
    }

    // Build recall questions (3–5 depending on concept count)
    const recallQuestions = recallConcepts.slice(0, 5).map((c, i) => ({
      order:      i + 1,
      concept_id: c.id,
      question:   `In your own words, explain: ${c.name}`,
      type:       "recall",
    }));

    await this.eventBus
      .emit(
        EventType.LECTURE_COMPLETED,
        studentId,
        {
          lecture_id:       lectureId,
          playlist_id:      playlistId,
          chapter_id:       chapterId ?? null,
          recall_questions: recallQuestions,
          recall_count:     recallQuestions.length,
        },
        { source: "lecture_service" }
      )
      .catch(() => { /* non-blocking */ });

    logger.info("lecture_service.completed", {
      student_id:    studentId,
      lecture_id:    lectureId,
      chapter_id:    chapterId,
      recall_count:  recallQuestions.length,
    });
  }
}
