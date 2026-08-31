import Link from "next/link";

interface Chapter {
  id: string;
  name: string;
  unit: string | null;
  sequence: number;
  importance: number;
}

interface Subject {
  id: string;
  name: string;
}

const IMPORTANCE_COLOR: Record<number, string> = {
  5: "text-red-400",
  4: "text-orange-400",
  3: "text-yellow-400",
  2: "text-gray-400",
  1: "text-gray-600",
};

export function ChapterList({
  subject,
  chapters,
}: {
  subject: Subject;
  chapters: Chapter[];
}) {
  // Group by unit
  const byUnit = chapters.reduce<Record<string, Chapter[]>>((acc, ch) => {
    const unit = ch.unit ?? "Other";
    if (!acc[unit]) acc[unit] = [];
    acc[unit]!.push(ch);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">{subject.name}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{chapters.length} chapters</p>
      </div>

      {Object.entries(byUnit).map(([unit, unitChapters]) => (
        <div key={unit} className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
            {unit}
          </p>
          {unitChapters.map((ch) => (
            <Link
              key={ch.id}
              href={`/study/${subject.id}/${ch.id}`}
              className="flex items-center justify-between bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-600 p-4 transition-colors"
            >
              <div>
                <p className="text-white text-sm font-medium">{ch.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">Ch. {ch.sequence}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold ${IMPORTANCE_COLOR[ch.importance] ?? "text-gray-400"}`}
                  title={`Board importance: ${ch.importance}/5`}
                >
                  {"★".repeat(ch.importance)}
                </span>
                <span className="text-gray-600 text-sm">›</span>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
