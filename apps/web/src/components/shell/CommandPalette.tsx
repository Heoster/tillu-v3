"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Command Palette — UI spec §6, §64.
 * Opened by Cmd/Ctrl+K from anywhere in the app.
 *
 * Supports:
 *   - Page navigation
 *   - Natural language actions (converted to routes or Tillu prompts)
 *   - Quick study actions
 */

interface Command {
  id:       string;
  label:    string;
  icon:     string;
  category: "navigation" | "action" | "study";
  action:   "navigate" | "prompt";
  target:   string;   // route or prompt text
  keywords: string[];
}

const COMMANDS: Command[] = [
  // Navigation
  { id: "go-home",       label: "Go to Home",            icon: "🏠", category: "navigation", action: "navigate", target: "/home",        keywords: ["home", "dashboard"] },
  { id: "go-plan",       label: "Open Plan",             icon: "📅", category: "navigation", action: "navigate", target: "/plan",        keywords: ["plan", "schedule", "today"] },
  { id: "go-study",      label: "Go to Study",           icon: "📖", category: "navigation", action: "navigate", target: "/study",       keywords: ["study", "learn"] },
  { id: "go-revision",   label: "Open Revision",         icon: "🧠", category: "navigation", action: "navigate", target: "/revision",    keywords: ["revision", "revise", "review", "recall"] },
  { id: "go-tests",      label: "Open Tests & Quizzes",  icon: "📝", category: "navigation", action: "navigate", target: "/tests",       keywords: ["quiz", "test", "exam", "questions"] },
  { id: "go-lectures",   label: "Open Lectures",         icon: "🎬", category: "navigation", action: "navigate", target: "/lectures",    keywords: ["lecture", "video", "watch", "youtube"] },
  { id: "go-mistakes",   label: "Open Mistake Bank",     icon: "❌", category: "navigation", action: "navigate", target: "/mistakes",    keywords: ["mistake", "error", "wrong", "repair"] },
  { id: "go-formulas",   label: "Open Formula Vault",    icon: "🔢", category: "navigation", action: "navigate", target: "/formulas",    keywords: ["formula", "equation", "reaction"] },
  { id: "go-research",   label: "Open Research",         icon: "🔎", category: "navigation", action: "navigate", target: "/research",    keywords: ["research", "search", "find"] },
  { id: "go-progress",   label: "Open Progress",         icon: "📊", category: "navigation", action: "navigate", target: "/progress",    keywords: ["progress", "mastery", "performance", "readiness"] },
  { id: "go-health",     label: "System Health",         icon: "🟢", category: "navigation", action: "navigate", target: "/system-health", keywords: ["health", "system", "agents", "sentinel"] },
  { id: "go-brain",      label: "Tillu Brain",           icon: "🧠", category: "navigation", action: "navigate", target: "/tillu-brain", keywords: ["brain", "state", "agents", "what is tillu doing"] },

  // Study actions
  { id: "act-next",      label: "What should I study?",  icon: "🎯", category: "study",      action: "navigate", target: "/home",        keywords: ["what should", "next", "best action", "study now"] },
  { id: "act-daily",     label: "Start daily quiz",      icon: "📝", category: "study",      action: "navigate", target: "/tests",       keywords: ["daily quiz", "start quiz"] },
  { id: "act-revision",  label: "Start revision now",    icon: "🔁", category: "study",      action: "navigate", target: "/revision",    keywords: ["start revision", "revise now", "due"] },
  { id: "act-weak",      label: "Show my weaknesses",    icon: "🔴", category: "study",      action: "navigate", target: "/progress",    keywords: ["weak", "weakness", "struggling"] },
  { id: "act-forgot",    label: "Show what I'm forgetting", icon: "🕳",category: "study",   action: "navigate", target: "/revision",    keywords: ["forgot", "forgetting", "memory", "radar"] },
  { id: "act-behind",    label: "I'm behind — recovery plan", icon: "⚠",category: "action", action: "navigate", target: "/plan",        keywords: ["behind", "missed", "late", "recover"] },
  { id: "act-lighter",   label: "Make today lighter",    icon: "🌤", category: "action",     action: "navigate", target: "/plan",        keywords: ["lighter", "easier", "reduce", "less"] },
  { id: "act-exam",      label: "Exam mode",             icon: "🎓", category: "study",      action: "navigate", target: "/tests",       keywords: ["exam", "mock", "timed", "board"] },
];

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: Props) {
  const router          = useRouter();
  const [query, setQuery] = useState("");
  const inputRef        = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter commands
  const q = query.toLowerCase().trim();
  const filtered = q === ""
    ? COMMANDS.slice(0, 8)
    : COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q))
      ).slice(0, 10);

  function execute(cmd: Command) {
    router.push(cmd.target);
    onClose();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && filtered[selected]) {
      execute(filtered[selected]);
    }
  }

  const categoryLabel: Record<string, string> = {
    navigation: "Navigate",
    study:      "Study",
    action:     "Actions",
  };

  // Group filtered by category
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    const cat = cmd.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(cmd);
    return acc;
  }, {});

  let globalIdx = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="fixed inset-x-4 top-[15vh] z-[101] max-w-xl mx-auto bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-slide-up"
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKey}
            placeholder="Ask Tillu anything, or navigate…"
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none"
            aria-label="Search commands"
          />
          <kbd className="text-[10px] text-gray-600 border border-gray-700 rounded px-1.5 py-0.5 font-mono shrink-0">esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              No commands found. Try "study", "quiz", "revision"…
            </div>
          ) : (
            Object.entries(grouped).map(([cat, cmds]) => (
              <div key={cat}>
                <p className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-medium text-gray-600">
                  {categoryLabel[cat] ?? cat}
                </p>
                {cmds.map((cmd) => {
                  const idx = globalIdx++;
                  const isSelected = idx === selected;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? "bg-violet-900/30 text-white" : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-base w-5 text-center shrink-0" aria-hidden>{cmd.icon}</span>
                      <span className="text-sm">{cmd.label}</span>
                      {isSelected && (
                        <span className="ml-auto text-[10px] text-gray-500 font-mono border border-gray-700 rounded px-1.5">↵</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-4 text-[10px] text-gray-600">
          <span><kbd className="font-mono border border-gray-700 rounded px-1">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono border border-gray-700 rounded px-1">↵</kbd> Select</span>
          <span><kbd className="font-mono border border-gray-700 rounded px-1">esc</kbd> Close</span>
        </div>
      </div>
    </>
  );
}
