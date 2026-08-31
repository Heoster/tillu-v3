import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChapterList } from "@/components/study/ChapterList";

interface Props {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectPage({ params }: Props) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/study" className="text-gray-400 hover:text-white text-sm">
          ← Study
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-white font-medium">{subject.name}</span>
      </div>

      <ChapterList
        subject={subject}
        chapters={chapters ?? []}
      />
    </div>
  );
}
