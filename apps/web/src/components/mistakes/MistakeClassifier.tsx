"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ERROR_TYPES = [
  { value: "conceptual",    label: "Concept misunderstood",  desc: "Didn't understand the underlying idea" },
  { value: "formula",       label: "Wrong formula",           desc: "Used the incorrect formula" },
  { value: "calculation",   label: "Arithmetic error",        desc: "Got the steps right but maths wrong" },
  { value: "sign",          label: "Sign convention",         desc: "Positive/negative error" },
  { value: "unit",          label: "Unit error",              desc: "Forgot to convert or used wrong units" },
  { value: "carelessness",  label: "Careless mistake",        desc: "Knew the answer, made a silly error" },
  { value: "misreading",    label: "Misread question",        desc: "Read the question incorrectly" },
  { value: "memory",        label: "Recall failure",          desc: "Couldn't remember the formula/fact" },
  { value: "time_pressure", label: "Time pressure",           desc: "Rushed and made an error" },
  { value: "presentation",  label: "Presentation",            desc: "Method right but answer poorly laid out" },
] as const;

type ErrorType = (typeof ERROR_TYPES)[number]["value"];

interface Props {
  conceptId:  string;
  questionId?: string;
  onDone:     (classified: boolean) => void;
}

/**
 * MistakeClassifier — appears after a wrong answer.
 * Asks the student to classify their error type.
 * Calls POST /mistakes to record and trigger pattern detection.
 *
 * onDone(true)  = mistake recorded
 * onDone(false) = skipped
 */
export function MistakeClassifier({ conceptId, questionId, onDone }: Props) {
  const [selected,  setSelected]  = useState<ErrorType | null>(null);
  const [cause,     setCause]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { onDone(false); return; }

      const apiBase = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";
      const res = await fetch(`${apiBase}/mistakes`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          concept_id:  conceptId,
          question_id: questionId,
          error_type:  selected,
          cause:       cause.trim() || undefined,
          source:      "session",
        }),
      });

      if (!res.ok) {
        setError("Failed to record mistake. Try again.");
        return;
      }

      onDone(true);
    } catch {
      setError("Network error. Mistake not recorded.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-red-800/30 p-5 space-y-4">
      {/* Header */}
      <div>
        <p className="text-red-400 text-sm font-semibold">Incorrect answer</p>
        <p className="text-white font-medium mt-1">What went wrong?</p>
        <p className="text-gray-400 text-xs mt-0.5">
          Identifying the error type helps Tillu build a targeted repair plan.
        </p>
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      {/* Error type grid */}
      <div className="grid grid-cols-1 gap-1.5">
        {ERROR_TYPES.map((et) => (
          <button
            key={et.value}
            onClick={() => setSelected(et.value)}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
              selected === et.value
                ? "border-indigo-500 bg-indigo-950/30"
                : "border-gray-800 hover:border-gray-600 bg-transparent"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                selected === et.value
                  ? "border-indigo-400 bg-indigo-400"
                  : "border-gray-600"
              }`}
              aria-hidden="true"
            >
              {selected === et.value && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{et.label}</p>
              <p className="text-xs text-gray-500">{et.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Optional cause note */}
      {selected && (
        <div>
          <label htmlFor="cause" className="text-xs text-gray-400 block mb-1">
            Any notes? <span className="text-gray-600">(optional)</span>
          </label>
          <textarea
            id="cause"
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            placeholder="e.g. Confused sign convention for concave mirror"
            maxLength={200}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => { void handleSubmit(); }}
          disabled={!selected || submitting}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          {submitting ? "Recording…" : "Record mistake"}
        </button>
        <button
          onClick={() => onDone(false)}
          className="px-4 text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
