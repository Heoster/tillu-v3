"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sessionsApi } from "@/lib/api";

interface Concept {
  id: string;
  name: string;
  description: string | null;
  importance: number;
}

interface Chapter {
  id: string;
  name: string;
}

export function ConceptList({
  chapter,
  subjectId,
  concepts,
}: {
  chapter: Chapter;
  subjectId: string;
  concepts: Concept[];
}) {
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startSession(conceptId: string) {
    setStarting(conceptId);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Please sign in first"); return; }

      await sessionsApi.start(session.access_token, {
        subject_id: subjectId,
        chapter_id: chapter.id,
        concept_id: conceptId,
        activity_type: "practice",
      });

      window.location.href = `/study/${subjectId}/${chapter.id}/session`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">{chapter.name}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{concepts.length} concepts</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {concepts.map((c) => (
          <div
            key={c.id}
            className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{c.name}</p>
                {c.description && (
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{c.description}</p>
                )}
              </div>
              <span className="text-yellow-500 text-xs shrink-0" aria-label={`Importance ${c.importance}`}>
                {"★".repeat(c.importance)}
              </span>
            </div>

            <button
              onClick={() => { void startSession(c.id); }}
              disabled={starting === c.id}
              className="w-full text-xs font-medium text-indigo-400 hover:text-indigo-300 border border-indigo-800/50 hover:border-indigo-600 rounded-lg py-1.5 transition-colors disabled:opacity-50"
            >
              {starting === c.id ? "Starting…" : "Start session"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
