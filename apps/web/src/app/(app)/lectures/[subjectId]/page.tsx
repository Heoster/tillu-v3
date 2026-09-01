import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ subjectId: string }>;
}

export default async function LectureSubjectPage({ params }: Props) {
  const { subjectId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, code")
    .eq("id", subjectId)
    .single();

  if (!subject) notFound();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, name, unit, sequence, importance")
    .eq("subject_id", subjectId)
    .order("sequence");

  // Group chapters by unit
  const byUnit: Record<string, typeof chapters> = {};
  for (const ch of chapters ?? []) {
    const unit = ch.unit ?? "Other";
    if (!byUnit[unit]) byUnit[unit] = [];
    byUnit[unit]!.push(ch);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/lectures" className="text-gray-400 hover:text-white">Lectures</Link>
        <span className="text-gray-600">/</span>
        <span className="text-white font-medium">{subject.name}</span>
      </div>

      <div className="space-y-5">
        {Object.entries(byUnit).map(([unit, unitChapters]) => (
          <div key={unit}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">
              {unit}
            </p>
            <div className="space-y-2">
              {(unitChapters ?? []).map((ch) => (
                <Link
                  key={ch.id}
                  href={`/lectures/${subjectId}/${ch.id}`}
                  className="flex items-center justify-between bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-600 p-4 transition-colors"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{ch.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">Ch. {ch.sequence}</p>
                  </div>
                  <span className="text-gray-600 text-sm">›</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
