import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ConceptList } from "@/components/study/ConceptList";

interface Props {
  params: Promise<{ subjectId: string; chapterId: string }>;
}

export default async function ChapterPage({ params }: Props) {
  const { subjectId, chapterId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, name, unit, subject_id")
    .eq("id", chapterId)
    .eq("subject_id", subjectId)
    .single();

  if (!chapter) notFound();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("id", subjectId)
    .single();

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, name, description, importance")
    .eq("chapter_id", chapterId)
    .order("name");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/study" className="text-gray-400 hover:text-white">Study</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/study/${subjectId}`} className="text-gray-400 hover:text-white">
          {subject?.name}
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-white font-medium">{chapter.name}</span>
      </div>

      <ConceptList
        chapter={chapter}
        subjectId={subjectId}
        concepts={concepts ?? []}
      />
    </div>
  );
}
