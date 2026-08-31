"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sessionsApi, type StudySession } from "@/lib/api";

/**
 * Focus Mode — active study session screen.
 * Shows timer, active session info, pause/end controls.
 */
export default function SessionPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  // Load the most recent active session
  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) { router.push("/auth/login"); return; }

      const sessions = await sessionsApi.list(authSession.access_token, 5);
      const active = sessions.find((s) => s.status === "active" || s.status === "paused");
      if (active) {
        setSession(active);
        // Calculate elapsed from started_at
        const started = new Date(active.started_at).getTime();
        setElapsed(Math.floor((Date.now() - started) / 1000));
      }
      setLoading(false);
    }
    void load();
  }, [router]);

  // Timer
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [session]);

  async function handleEnd(outcome: "completed" | "abandoned") {
    if (!session) return;
    setEnding(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;

    await sessionsApi.end(authSession.access_token, session.id, outcome);
    router.push("/home");
  }

  async function handlePause() {
    if (!session) return;
    const supabase = createSupabaseBrowserClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;

    const updated = await sessionsApi.pause(authSession.access_token, session.id);
    setSession(updated);
  }

  async function handleResume() {
    if (!session) return;
    const supabase = createSupabaseBrowserClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;

    const updated = await sessionsApi.resume(authSession.access_token, session.id);
    setSession(updated);
  }

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading session…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4 text-center py-16">
        <p className="text-gray-400">No active session found.</p>
        <button
          onClick={() => router.back()}
          className="text-indigo-400 text-sm hover:text-indigo-300"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const isPaused = session.status === "paused";

  return (
    <div className="flex flex-col items-center justify-between min-h-[70vh] py-8">
      {/* Session info */}
      <div className="text-center space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          {session.activity_type}
        </p>
        <h2 className="text-white font-semibold text-lg">Study Session</h2>
        {isPaused && (
          <span className="text-yellow-400 text-xs bg-yellow-900/30 px-2 py-0.5 rounded-full">
            Paused
          </span>
        )}
      </div>

      {/* Timer */}
      <div className="text-center">
        <p className="text-6xl font-mono font-bold text-white tabular-nums">
          {hh}:{mm}:{ss}
        </p>
        <p className="text-gray-500 text-xs mt-2">
          {session.planned_duration_min
            ? `Goal: ${session.planned_duration_min} min`
            : "Open session"}
        </p>
      </div>

      {/* Controls */}
      <div className="w-full space-y-3">
        {isPaused ? (
          <button
            onClick={() => { void handleResume(); }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            ▶ Resume
          </button>
        ) : (
          <button
            onClick={() => { void handlePause(); }}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            ⏸ Pause
          </button>
        )}

        <button
          onClick={() => { void handleEnd("completed"); }}
          disabled={ending}
          className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {ending ? "Ending…" : "✓ Complete session"}
        </button>

        <button
          onClick={() => { void handleEnd("abandoned"); }}
          disabled={ending}
          className="w-full text-gray-500 hover:text-red-400 text-sm py-2 transition-colors"
        >
          Abandon session
        </button>
      </div>
    </div>
  );
}
