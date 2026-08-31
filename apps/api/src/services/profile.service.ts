import { getServiceClient } from "@tillu/database";
import { TilluError, ValidationError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";
import { z } from "zod";

const logger = createLogger({ service: "profile_service" });

// ── Input schemas ─────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  exam_date: z.string().date().optional().nullable(),
});

export const UpdateSubjectsSchema = z.object({
  subject_ids: z.array(z.string().uuid()).min(1).max(10),
});

export const AvailabilityWindowSchema = z.object({
  day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  start_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

export const UpdateAvailabilitySchema = z.object({
  windows: z.array(AvailabilityWindowSchema),
  sleep_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  sleep_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateSubjectsInput = z.infer<typeof UpdateSubjectsSchema>;
export type UpdateAvailabilityInput = z.infer<typeof UpdateAvailabilitySchema>;

// ── Service ───────────────────────────────────────────────────────────────────

export class ProfileService {
  /** Get the full student profile for a given user_id */
  async getProfile(userId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("student_profiles")
      .select("*, student_preferences(*)")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new TilluError("Profile not found", "NOT_FOUND", false, { user_id: userId });
    }

    return data;
  }

  /** Create or update the student profile */
  async upsertProfile(userId: string, input: UpdateProfileInput) {
    const parsed = UpdateProfileSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid profile data", { errors: parsed.error.flatten() });
    }

    const db = getServiceClient();

    // Check if profile exists
    const { data: existing } = await db
      .from("student_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      const { data, error } = await db
        .from("student_profiles")
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
      logger.info("profile.updated", { user_id: userId });
      return data;
    } else {
      // Create new profile
      const { data, error } = await db
        .from("student_profiles")
        .insert({ user_id: userId, name: "Student", ...parsed.data })
        .select()
        .single();

      if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
      logger.info("profile.created", { user_id: userId });
      return data;
    }
  }

  /** Save selected subjects as student preferences */
  async updateSubjects(studentId: string, input: UpdateSubjectsInput) {
    const parsed = UpdateSubjectsSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid subjects data", { errors: parsed.error.flatten() });
    }

    const db = getServiceClient();

    // Verify subjects exist
    const { data: subjects, error: subErr } = await db
      .from("subjects")
      .select("id, name")
      .in("id", parsed.data.subject_ids);

    if (subErr) throw new TilluError(subErr.message, "DATABASE_ERROR", true);
    if (!subjects || subjects.length !== parsed.data.subject_ids.length) {
      throw new ValidationError("One or more subject IDs are invalid");
    }

    // Store as a preference
    const { error } = await db.from("student_preferences").upsert(
      {
        student_id: studentId,
        key: "selected_subjects",
        value: JSON.stringify(parsed.data.subject_ids),
        source: "configured",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,key" }
    );

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    logger.info("profile.subjects_updated", {
      student_id: studentId,
      count: parsed.data.subject_ids.length,
    });

    return { subjects };
  }

  /** Save availability windows */
  async updateAvailability(studentId: string, input: UpdateAvailabilityInput) {
    const parsed = UpdateAvailabilitySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid availability data", { errors: parsed.error.flatten() });
    }

    const db = getServiceClient();
    const prefs = [
      {
        student_id: studentId,
        key: "availability_windows",
        value: JSON.stringify(parsed.data.windows),
        source: "configured" as const,
        updated_at: new Date().toISOString(),
      },
    ];

    if (parsed.data.sleep_start) {
      prefs.push({
        student_id: studentId,
        key: "sleep_start",
        value: parsed.data.sleep_start,
        source: "configured" as const,
        updated_at: new Date().toISOString(),
      });
    }

    if (parsed.data.sleep_end) {
      prefs.push({
        student_id: studentId,
        key: "sleep_end",
        value: parsed.data.sleep_end,
        source: "configured" as const,
        updated_at: new Date().toISOString(),
      });
    }

    const { error } = await db
      .from("student_preferences")
      .upsert(prefs, { onConflict: "student_id,key" });

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    logger.info("profile.availability_updated", { student_id: studentId });
    return { success: true };
  }
}
