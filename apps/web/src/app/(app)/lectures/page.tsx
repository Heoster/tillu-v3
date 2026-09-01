import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

/**
 * Lectures screen — shows subjects for the student to select a chapter
 * and watch lectures through the local agent.
 * Phase 4: browse subjects → chapters → playlists/lectures.
 */
export default async function LecturesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Load subjects from DB
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, code")
    .eq("board", "CBSE")
    .eq("class", "12")
    .order("name");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Lectures</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          Select a subject and chapter to watch via the local agent.
        </p>
      </div>

      {/* Local agent status */}
      <LocalAgentBanner />

      {/* Subject list */}
      <div className="grid grid-cols-2 gap-3">
        {(subjects ?? []).map((subject) => (
          <Link
            key={subject.id}
            href={`/lectures/${subject.id}`}
            className="bg-gray-900 rounded-2xl border border-gray-800 hover:border-indigo-700/50 p-4 transition-colors"
          >
            <p className="text-white font-medium text-sm">{subject.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">{subject.code}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LocalAgentBanner() {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 flex items-start gap-3">
      <div className="w-2 h-2 rounded-full bg-gray-500 mt-1 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm text-gray-300 font-medium">Local agent required</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Lectures open in a controlled Chromium window via the Tillu local agent.
          Make sure the local agent is running on your computer.
        </p>
      </div>
    </div>
  );
}
