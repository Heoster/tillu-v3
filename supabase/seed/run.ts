/**
 * CBSE Class 12 Seed Runner
 *
 * Run: npx tsx supabase/seed/run.ts
 *
 * Idempotent — safe to run multiple times (uses upsert on code+board+class).
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
 */

import { createClient } from "@supabase/supabase-js";
import { CBSE_CLASS_12_SEED } from "./cbse_data.js";

async function main() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    console.error("❌  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    process.exit(1);
  }

  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🌱  Starting CBSE Class 12 seed...\n");

  let totalSubjects = 0;
  let totalChapters = 0;
  let totalConcepts = 0;

  for (const subjectData of CBSE_CLASS_12_SEED) {
    // Upsert subject
    const { data: subject, error: subError } = await db
      .from("subjects")
      .upsert(
        { name: subjectData.name, code: subjectData.code, board: "CBSE", class: "12" },
        { onConflict: "code,board,class" }
      )
      .select("id")
      .single();

    if (subError || !subject) {
      console.error(`❌  Failed to upsert subject ${subjectData.name}:`, subError?.message);
      continue;
    }

    totalSubjects++;
    console.log(`✅  Subject: ${subjectData.name} (${subjectData.code})`);

    for (const chapterData of subjectData.chapters) {
      // Check if chapter exists (match by name + subject_id)
      const { data: existing } = await db
        .from("chapters")
        .select("id")
        .eq("subject_id", subject.id)
        .eq("name", chapterData.name)
        .single();

      let chapterId: string;

      if (existing) {
        chapterId = existing.id;
      } else {
        const { data: chapter, error: chError } = await db
          .from("chapters")
          .insert({
            subject_id: subject.id,
            name: chapterData.name,
            unit: chapterData.unit,
            sequence: chapterData.sequence,
            importance: chapterData.importance,
          })
          .select("id")
          .single();

        if (chError || !chapter) {
          console.error(`  ❌  Failed to insert chapter ${chapterData.name}:`, chError?.message);
          continue;
        }
        chapterId = chapter.id;
      }

      totalChapters++;

      for (const conceptData of chapterData.concepts) {
        // Check if concept exists (match by name + chapter_id)
        const { data: existingConcept } = await db
          .from("concepts")
          .select("id")
          .eq("chapter_id", chapterId)
          .eq("name", conceptData.name)
          .single();

        if (!existingConcept) {
          const { error: cError } = await db.from("concepts").insert({
            chapter_id: chapterId,
            name: conceptData.name,
            description: conceptData.description,
            importance: conceptData.importance,
            prerequisites: [],
            related: [],
            source: "ncert_cbse",
            source_version: "2024-25",
          });

          if (cError) {
            console.error(`    ❌  Failed to insert concept ${conceptData.name}:`, cError.message);
            continue;
          }
        }
        totalConcepts++;
      }
    }
  }

  console.log("\n─────────────────────────────────────");
  console.log(`✅  Seed complete`);
  console.log(`   Subjects : ${totalSubjects}`);
  console.log(`   Chapters : ${totalChapters}`);
  console.log(`   Concepts : ${totalConcepts}`);
  console.log("─────────────────────────────────────\n");
}

main().catch((err: unknown) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
