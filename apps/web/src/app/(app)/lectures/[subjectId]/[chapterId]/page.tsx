"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Lecture {
  id:          string;
  title:       string;
  sequence:    number;
  duration_sec: number | null;
  progress:    { position_sec: number; completed: boolean; progress_pct: number } | null;
}

interface Playlist {
  id:       string;
  title:    string;
  lectures: Lecture[];
}

/**
 * Chapter lectures page — lists approved playlists and lectures.
 * Shows progress per lecture and "Resume" / "Watch" buttons.
 * "Watch" calls the local agent to open Chromium.
 */
export default function ChapterLecturesPage() {
  const params   = useParams<{ subjectId: string; chapterId: string }>();
  const router   = useRouter();
  const [playlists, setPlaylists]   = useState<Playlist[]>([]);
  const [loading, setLoading]       = useState(true);
  const [launching, setLaunching]   = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/auth/login"); return; }

        const apiBase = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";
        const res = await fetch(
          `${apiBase}/lectures/chapters/${params.chapterId}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (!res.ok) { setError("Failed to load playlists"); return; }

        const data = await res.json() as { playlists: Playlist[] };
        setPlaylists(data.playlists ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.chapterId, router]);

  async function handleWatch(lecture: Lecture) {
    setLaunching(lecture.id);
    setError(null);
    try {
      // Call local agent to launch and navigate
      const localSecret = process.env["NEXT_PUBLIC_LOCAL_AGENT_SECRET"] ?? "";
      const localPort   = 3099;

      // Step 1: Ensure browser is launched
      await fetch(`http://localhost:${localPort}/launch`, {
        method: "POST",
        headers: { "x-agent-secret": localSecret },
      });

      // Step 2: Navigate to lecture
      await fetch(`http://localhost:${localPort}/navigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-agent-secret": localSecret },
        body: JSON.stringify({ url: buildYouTubeUrl(lecture.id), lecture_id: lecture.id }),
      });
    } catch (err) {
      setError(
        "Could not reach the local agent. " +
        "Make sure it is running: npm run dev (in apps/local-agent)"
      );
    } finally {
      setLaunching(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Loading lectures…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/lectures" className="text-gray-400 hover:text-white">Lectures</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/lectures/${params.subjectId}`} className="text-gray-400 hover:text-white">Subject</Link>
        <span className="text-gray-600">/</span>
        <span className="text-white font-medium">Chapter</span>
      </div>

      {error && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-3 text-yellow-300 text-sm">
          {error}
        </div>
      )}

      {playlists.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center">
          <p className="text-gray-400">No approved playlists for this chapter yet.</p>
        </div>
      ) : (
        playlists.map((pl) => (
          <div key={pl.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-indigo-400">{pl.title}</h3>
            {pl.lectures.map((lec) => (
              <LectureCard
                key={lec.id}
                lecture={lec}
                launching={launching === lec.id}
                onWatch={() => { void handleWatch(lec); }}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function LectureCard({
  lecture,
  launching,
  onWatch,
}: {
  lecture:   Lecture;
  launching: boolean;
  onWatch:   () => void;
}) {
  const prog       = lecture.progress;
  const pct        = prog?.progress_pct ?? 0;
  const completed  = prog?.completed ?? false;
  const started    = prog != null && !completed;
  const durationMin = lecture.duration_sec ? Math.ceil(lecture.duration_sec / 60) : null;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {lecture.sequence}. {lecture.title}
          </p>
          {durationMin && (
            <p className="text-gray-500 text-xs mt-0.5">{durationMin} min</p>
          )}
        </div>
        {completed && <span className="text-green-400 text-xs font-semibold shrink-0">✓ Done</span>}
      </div>

      {/* Progress bar */}
      {(started || completed) && (
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${completed ? "bg-green-500" : "bg-indigo-500"}`}
            style={{ width: `${Math.max(pct, completed ? 100 : 2)}%` }}
          />
        </div>
      )}

      <button
        onClick={onWatch}
        disabled={launching}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
          completed
            ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
            : started
            ? "bg-indigo-700 hover:bg-indigo-600 text-white"
            : "bg-indigo-600 hover:bg-indigo-500 text-white"
        } disabled:opacity-50`}
      >
        {launching
          ? "Opening…"
          : completed
          ? "Watch again"
          : started
          ? `Resume (${pct}%)`
          : "Watch"}
      </button>
    </div>
  );
}

// YouTube URL is stored in the lecture record — placeholder for now
function buildYouTubeUrl(lectureId: string): string {
  // In practice, the lecture.url field from DB would be used
  // This is a fallback for scaffold purposes
  return `https://www.youtube.com/watch?v=${lectureId}`;
}
