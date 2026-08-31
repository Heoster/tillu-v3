"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { profileApi } from "@/lib/api";

/**
 * Onboarding — minimal first-launch flow.
 * Keeps it short: name, exam date. Subjects and availability are optional here.
 * Everything else Tillu learns from behaviour.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"profile" | "done">("profile");
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    setSaving(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }

      await profileApi.update(session.access_token, {
        name: name.trim(),
        ...(examDate ? { exam_date: examDate } : {}),
      });

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-4xl">🎉</p>
          <h2 className="text-xl font-semibold text-white">You&apos;re all set, {name}!</h2>
          <p className="text-gray-400 text-sm">
            Tillu is ready. Start your first study session to begin tracking progress.
          </p>
          <button
            onClick={() => router.push("/home")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl"
          >
            Go to Home →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-400">Tillu</h1>
          <p className="text-gray-400 text-sm mt-1">Let&apos;s set up your study environment</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Quick setup</h2>
          <p className="text-gray-400 text-sm">
            Just two things — Tillu learns the rest from how you study.
          </p>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="name" className="text-sm text-gray-400">What should Tillu call you?</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="examDate" className="text-sm text-gray-400">
              Board exam date <span className="text-gray-600">(optional)</span>
            </label>
            <input
              id="examDate"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={() => { void handleSave(); }}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? "Saving…" : "Let's go →"}
          </button>
        </div>
      </div>
    </div>
  );
}
