"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  studentName:      string | null;
  onOpenCmd:        () => void;
  onToggleSidebar:  () => void;
  sidebarOpen:      boolean;
}

/**
 * Global TopBar — UI spec §2
 * ☰  TILLU        Search…        🧠 State     🔔      ⚙
 */
export function TopBar({ studentName, onOpenCmd, onToggleSidebar, sidebarOpen }: Props) {
  // Keyboard shortcut: Cmd/Ctrl+K → command palette
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenCmd();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenCmd]);

  return (
    <header className="sticky top-0 z-40 h-12 bg-gray-950/90 backdrop-blur border-b border-gray-800/60 flex items-center px-3 gap-2 shrink-0">
      {/* Mobile menu button */}
      <button
        className="lg:hidden w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        aria-label="Open navigation"
        onClick={onToggleSidebar}
      >
        <span aria-hidden>☰</span>
      </button>

      {/* Logo */}
      <Link href="/home" className="text-violet-400 font-bold text-base mr-2 shrink-0">
        Tillu
      </Link>

      {/* Search / command palette trigger */}
      <button
        onClick={onOpenCmd}
        className="flex-1 max-w-xs lg:max-w-sm flex items-center gap-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 rounded-lg px-3 h-7 text-left transition-colors group"
        aria-label="Open command palette (⌘K)"
      >
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-gray-500 text-xs flex-1 group-hover:text-gray-400 transition-colors hidden sm:block">
          Ask Tillu anything…
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-gray-600 text-[10px] font-mono border border-gray-700 rounded px-1 py-0.5">
          <span>⌘</span><span>K</span>
        </kbd>
      </button>

      <div className="flex items-center gap-1 ml-auto">
        {/* Student name / state indicator */}
        {studentName && (
          <span className="hidden md:block text-xs text-gray-500 mr-1">{studentName}</span>
        )}

        {/* Tillu Brain link */}
        <Link
          href="/tillu-brain"
          className="w-8 h-8 flex items-center justify-center text-violet-400 hover:text-violet-300 hover:bg-violet-900/20 rounded-lg transition-colors"
          aria-label="Tillu Brain"
          title="Tillu Brain"
        >
          <span aria-hidden>🧠</span>
        </Link>

        {/* Notifications */}
        <button
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors relative"
          aria-label="Notifications"
        >
          <span aria-hidden>🔔</span>
        </button>

        {/* Tillu sidebar toggle (desktop) */}
        <button
          onClick={onToggleSidebar}
          className={`hidden lg:flex w-8 h-8 items-center justify-center rounded-lg transition-colors ${
            sidebarOpen
              ? "text-violet-400 bg-violet-900/20"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
          aria-label="Toggle Tillu sidebar"
          title="Tillu Chat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Settings"
        >
          <span aria-hidden>⚙️</span>
        </Link>
      </div>
    </header>
  );
}
