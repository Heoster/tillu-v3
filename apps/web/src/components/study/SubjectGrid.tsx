import Link from "next/link";

interface Subject {
  id: string;
  name: string;
  code: string;
}

const SUBJECT_ICONS: Record<string, string> = {
  PHY: "⚛️",
  CHE: "🧪",
  MAT: "📐",
  BIO: "🧬",
  CS:  "💻",
  ENG: "📝",
};

const SUBJECT_COLORS: Record<string, string> = {
  PHY: "border-blue-700/40 hover:border-blue-600",
  CHE: "border-green-700/40 hover:border-green-600",
  MAT: "border-purple-700/40 hover:border-purple-600",
  BIO: "border-emerald-700/40 hover:border-emerald-600",
  CS:  "border-cyan-700/40 hover:border-cyan-600",
  ENG: "border-orange-700/40 hover:border-orange-600",
};

export function SubjectGrid({ subjects }: { subjects: Subject[] }) {
  if (subjects.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        No subjects found. Run the seed script to populate CBSE data.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {subjects.map((subject) => (
        <Link
          key={subject.id}
          href={`/study/${subject.id}`}
          className={`bg-gray-900 rounded-2xl border p-4 transition-colors ${
            SUBJECT_COLORS[subject.code] ?? "border-gray-800 hover:border-gray-600"
          }`}
        >
          <span className="text-2xl block mb-2" aria-hidden="true">
            {SUBJECT_ICONS[subject.code] ?? "📚"}
          </span>
          <p className="text-white font-medium text-sm leading-tight">{subject.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{subject.code}</p>
        </Link>
      ))}
    </div>
  );
}
