"use client";

import { useState, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Tillu Chat Sidebar — UI spec §3.
 *
 * Context-aware: knows which page the student is on and surfaces
 * relevant suggested actions automatically.
 *
 * Desktop: persistent panel on the right (320px), shown/hidden by TopBar toggle.
 * Mobile: full-height drawer from the right.
 *
 * Modes: Normal | Study | Tutor | Research | Exam | Revision | Planning | System
 */

// ── Context-aware suggested actions per pathname ──────────────────────────────

type ActionDef = { label: string; icon: string; prompt: string };

const PAGE_ACTIONS: Record<string, ActionDef[]> = {
  "/home":     [
    { label: "What should I do?",    icon: "🎯", prompt: "What is the best thing I can study right now?" },
    { label: "Why this task?",       icon: "❓", prompt: "Why did you recommend this next action?" },
    { label: "Give me 20 min task",  icon: "⏱",  prompt: "I have 20 minutes. What should I do?" },
  ],
  "/revision": [
    { label: "Why is this due?",     icon: "❓", prompt: "Why is this revision item due?" },
    { label: "Quiz me",              icon: "🧠", prompt: "Quiz me on my revision due items." },
    { label: "Show what I forgot",   icon: "🔴", prompt: "What concepts am I most likely forgetting?" },
  ],
  "/study":    [
    { label: "Give me a hint",       icon: "💡", prompt: "Give me a hint for the current question." },
    { label: "Explain this",         icon: "📖", prompt: "Explain the current concept to me." },
    { label: "Ask Tutor",            icon: "🎓", prompt: "I need tutoring help with this concept." },
  ],
  "/mistakes": [
    { label: "Why do I keep failing?", icon: "❓", prompt: "Why am I making repeated mistakes on this concept?" },
    { label: "Repair plan",          icon: "🔧", prompt: "Build me a repair plan for my top mistake pattern." },
    { label: "Quiz on mistakes",     icon: "🧠", prompt: "Quiz me on the concepts where I keep making mistakes." },
  ],
  "/progress": [
    { label: "What is causing weakness?", icon: "📉", prompt: "What is causing my Physics weakness?" },
    { label: "How am I improving?",  icon: "📈", prompt: "Show me how I have improved in the last 30 days." },
    { label: "What to fix first?",   icon: "🎯", prompt: "What should I fix first to improve my board readiness?" },
  ],
  "/plan":     [
    { label: "Why did this change?", icon: "❓", prompt: "Why did Tillu change my plan?" },
    { label: "Make today lighter",   icon: "🌤",  prompt: "Make today's plan a bit lighter." },
    { label: "I'm behind",           icon: "⚠",  prompt: "I am behind on my plan. Help me recover." },
  ],
  "/tests":    [
    { label: "Start daily quiz",     icon: "📝", prompt: "Start my daily quiz now." },
    { label: "Weak area quiz",       icon: "🔴", prompt: "Quiz me on my weakest concepts." },
    { label: "PYQ practice",         icon: "📋", prompt: "Give me past year questions to practice." },
  ],
  "/lectures": [
    { label: "Summarize lecture",    icon: "📝", prompt: "Summarize what I just watched." },
    { label: "Quiz me on lecture",   icon: "🧠", prompt: "Quiz me on the lecture I just watched." },
    { label: "Explain current topic",icon: "📖", prompt: "Explain the current topic in simpler terms." },
  ],
};

const DEFAULT_ACTIONS: ActionDef[] = [
  { label: "What should I study?",  icon: "🎯", prompt: "What is the best thing I can study right now?" },
  { label: "I have 15 minutes",     icon: "⏱",  prompt: "I have 15 minutes. What should I do?" },
  { label: "Show my weaknesses",    icon: "🔴", prompt: "What are my current weakest concepts?" },
];

const MODES = ["Normal", "Study", "Tutor", "Research", "Revision", "Planning", "System"] as const;
type Mode = (typeof MODES)[number];

// ── Message types ─────────────────────────────────────────────────────────────

interface Message {
  id:      string;
  role:    "user" | "tillu";
  content: string;
  time:    string;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
  pathname: string;
}

export function TilluSidebar({ isOpen, onClose, pathname }: Props) {
  const [mode, setMode]         = useState<Mode>("Normal");
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id:      "welcome",
      role:    "tillu",
      content: "Hi! I'm Tillu. I know where you are and what you're studying. Ask me anything.",
      time:    now(),
    },
  ]);
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  // Get context-aware actions for current page
  const matchKey = Object.keys(PAGE_ACTIONS).find((k) => pathname.startsWith(k));
  const suggestedActions = matchKey ? (PAGE_ACTIONS[matchKey] ?? DEFAULT_ACTIONS) : DEFAULT_ACTIONS;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim(), time: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const apiBase = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";

      // Build context from current pathname
      const pageContext = matchKey ? `User is on the ${matchKey} page.` : "";
      const systemContext = `Mode: ${mode}. ${pageContext} Tillu is a CBSE Class 12 study companion.`;

      const res = await fetch(`${apiBase}/tutor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text.trim(), mode, context: systemContext }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const data = await res.json() as { reply?: string };
        const reply = data.reply ?? "I'm thinking about that. Try asking again in a moment.";
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "tillu", content: reply, time: now() }]);
      } else {
        setMessages((prev) => [...prev, fallbackMessage()]);
      }
    } catch {
      setMessages((prev) => [...prev, fallbackMessage()]);
    } finally {
      setLoading(false);
    }
  }

  const handleAction = (action: ActionDef) => { void sendMessage(action.prompt); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); void sendMessage(input); };

  // Sidebar base classes
  const sidebarCls = [
    // Desktop: fixed width panel
    "hidden lg:flex flex-col w-sidebar border-l border-gray-800/60 bg-gray-950 shrink-0",
    // Mobile: full-height drawer from right, shown as fixed overlay
    "lg:hidden fixed inset-y-0 right-0 w-full max-w-sm z-50 flex flex-col bg-gray-950 border-l border-gray-800 shadow-2xl",
    "transition-transform duration-200",
    isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
  ].join(" ");

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`${sidebarCls} ${!isOpen ? "lg:hidden" : ""}`}
        aria-label="Tillu Chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-violet-400 font-bold text-sm">🧠 Tillu</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-500 truncate max-w-24">{pathnameLabel(pathname)}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Mode selector */}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
              aria-label="Chat mode"
            >
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              onClick={onClose}
              className="lg:hidden w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {loading && <ThinkingBubble />}
          <div ref={bottomRef} />
        </div>

        {/* Suggested actions */}
        {!loading && (
          <div className="px-3 py-2 border-t border-gray-800/60 shrink-0">
            <p className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider font-medium">Suggested</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedActions.slice(0, 3).map((a) => (
                <button
                  key={a.label}
                  onClick={() => handleAction(a)}
                  className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-2 py-1 rounded-lg transition-colors"
                >
                  <span aria-hidden>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action bar — UI spec §5 */}
        <div className="px-3 py-2 border-t border-gray-800 shrink-0 space-y-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { icon: "🧠", label: "Quiz",    prompt: "Quiz me on my current topic." },
              { icon: "🔁", label: "Revise",  prompt: "Start a quick revision session." },
              { icon: "🔎", label: "Research",prompt: "Research this topic for me." },
              { icon: "📄", label: "Explain", prompt: "Explain what I'm currently studying." },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => void sendMessage(a.prompt)}
                className="shrink-0 flex items-center gap-1 text-xs text-gray-500 hover:text-violet-300 hover:bg-violet-900/20 px-2 py-1 rounded-lg transition-colors"
                title={a.label}
              >
                <span aria-hidden>{a.icon}</span>
                <span className="hidden sm:inline">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Tillu…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              disabled={loading}
              aria-label="Message Tillu"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
              aria-label="Send"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isTillu = msg.role === "tillu";
  return (
    <div className={`flex ${isTillu ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
        isTillu
          ? "bg-gray-800 text-gray-200 rounded-tl-sm"
          : "bg-violet-700 text-white rounded-tr-sm"
      }`}>
        <p>{msg.content}</p>
        <p className="text-[10px] mt-1 opacity-40">{msg.time}</p>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-soft"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fallbackMessage(): Message {
  return {
    id:      crypto.randomUUID(),
    role:    "tillu",
    content: "I'm temporarily unavailable. Your study system is still running — check the revision tab or try again in a moment.",
    time:    now(),
  };
}

function pathnameLabel(pathname: string): string {
  const labels: Record<string, string> = {
    "/home":        "Home",
    "/plan":        "Plan",
    "/study":       "Study",
    "/revision":    "Revision",
    "/tests":       "Tests",
    "/lectures":    "Lectures",
    "/research":    "Research",
    "/mistakes":    "Mistakes",
    "/formulas":    "Formulas",
    "/progress":    "Progress",
    "/tillu-brain": "Brain",
  };
  const key = Object.keys(labels).find((k) => pathname.startsWith(k));
  return key ? (labels[key] ?? pathname) : pathname;
}
