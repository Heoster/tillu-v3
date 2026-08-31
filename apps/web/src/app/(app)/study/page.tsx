import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SubjectGrid } from "@/components/study/SubjectGrid";

/**
 * Study screen — subjects → chapters → concepts → session.
 * Phase 1: shows subject grid seeded from CBSE data.
 */
export default async function StudyPage() {
  const supabase = await createSupabaseServerClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, code")
    .eq("board", "CBSE")
    .eq("class", "12")
    .order("name");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Study</h2>
      <p className="text-gray-400 text-sm">Select a subject to begin</p>
      <SubjectGrid subjects={subjects ?? []} />
    </div>
  );
}
