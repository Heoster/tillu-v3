import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SubjectGrid } from "@/components/study/SubjectGrid";
import Link from "next/link";

/**
 * Study screen — subjects → chapters → concepts → session.
 * Phase 1: subject grid.
 * Phase 4: quick-nav to Lectures and Mistake Bank.
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
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-white">Study</h2>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/lectures"
          className="bg-gray-900 rounded-xl border border-gray-800 hover:border-indigo-700/50 p-3 flex items-center gap-2 transition-colors"
        >
          <span className="text-lg" aria-hidden="true">🎬</span>
          <div>
            <p className="text-white text-sm font-medium">Lectures</p>
            <p className="text-gray-500 text-xs">Watch via local agent</p>
          </div>
        </Link>
        <Link
          href="/mistakes"
          className="bg-gray-900 rounded-xl border border-gray-800 hover:border-red-800/50 p-3 flex items-center gap-2 transition-colors"
        >
          <span className="text-lg" aria-hidden="true">🔴</span>
          <div>
            <p className="text-white text-sm font-medium">Mistakes</p>
            <p className="text-gray-500 text-xs">Bank &amp; repair</p>
          </div>
        </Link>
      </div>

      <p className="text-gray-400 text-sm">Practice by subject</p>
      <SubjectGrid subjects={subjects ?? []} />
    </div>
  );
}
