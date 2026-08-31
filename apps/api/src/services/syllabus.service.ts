import { getServiceClient } from "@tillu/database";
import { TilluError } from "@tillu/utilities";
import { createLogger } from "@tillu/logging";

const logger = createLogger({ service: "syllabus_service" });

export class SyllabusService {
  /** Get all CBSE Class 12 subjects */
  async getSubjects(board = "CBSE", cls = "12") {
    const db = getServiceClient();
    const { data, error } = await db
      .from("subjects")
      .select("*")
      .eq("board", board)
      .eq("class", cls)
      .order("name");

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);
    return data ?? [];
  }

  /** Get chapters for a subject, ordered by sequence */
  async getChapters(subjectId: string) {
    const db = getServiceClient();

    // Verify subject exists
    const { data: subject } = await db
      .from("subjects")
      .select("id, name")
      .eq("id", subjectId)
      .single();

    if (!subject) {
      throw new TilluError("Subject not found", "NOT_FOUND", false, { subject_id: subjectId });
    }

    const { data, error } = await db
      .from("chapters")
      .select("*")
      .eq("subject_id", subjectId)
      .order("sequence");

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    logger.info("syllabus.chapters_fetched", { subject_id: subjectId, count: data?.length });
    return { subject, chapters: data ?? [] };
  }

  /** Get concepts for a chapter, ordered by name */
  async getConcepts(chapterId: string) {
    const db = getServiceClient();

    const { data: chapter } = await db
      .from("chapters")
      .select("id, name, subject_id")
      .eq("id", chapterId)
      .single();

    if (!chapter) {
      throw new TilluError("Chapter not found", "NOT_FOUND", false, { chapter_id: chapterId });
    }

    const { data, error } = await db
      .from("concepts")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("name");

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    return { chapter, concepts: data ?? [] };
  }

  /** Full syllabus tree: subjects → chapters → concepts count */
  async getSyllabusOverview(board = "CBSE", cls = "12") {
    const db = getServiceClient();

    const { data: subjects, error } = await db
      .from("subjects")
      .select(`
        id, name, code,
        chapters (
          id, name, unit, sequence, importance,
          concepts ( id )
        )
      `)
      .eq("board", board)
      .eq("class", cls)
      .order("name");

    if (error) throw new TilluError(error.message, "DATABASE_ERROR", true);

    // Add concept count per chapter
    return (subjects ?? []).map((s) => ({
      ...s,
      chapters: (s.chapters ?? []).map((ch) => ({
        ...ch,
        concept_count: (ch.concepts ?? []).length,
        concepts: undefined, // don't expose full concept list in overview
      })),
    }));
  }
}
