"use client";

import { useState } from "react";
import { LeftNav } from "./LeftNav";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { TilluSidebar } from "./TilluSidebar";
import { CommandPalette } from "./CommandPalette";
import { TilluFab } from "./TilluFab";
import { usePathname } from "next/navigation";

interface Props {
  studentName: string | null;
  children: React.ReactNode;
}

/**
 * AppShell — implements the 3-zone layout from UI spec §2.
 *
 * Desktop (≥1024px):
 *   ┌──────────────────────────────────────────────────────┐
 *   │  TopBar (full width, z-40)                           │
 *   ├──────────┬───────────────────────┬───────────────────┤
 *   │ LeftNav  │     Workspace         │  Tillu Sidebar    │
 *   │ 240px    │     flex-1            │  320px            │
 *   └──────────┴───────────────────────┴───────────────────┘
 *
 * Mobile (<1024px):
 *   TopBar + Workspace + BottomNav + Floating Tillu button
 *   Tillu sidebar slides in from right as drawer
 */
export function AppShell({ studentName, children }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen,     setCmdOpen]     = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* ── Top bar (full width) ─────────────────────────── */}
      <TopBar
        studentName={studentName}
        onOpenCmd={() => setCmdOpen(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />

      {/* ── 3-zone body ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Zone 1: Left navigation (desktop only) */}
        <aside className="hidden lg:flex flex-col w-nav shrink-0 border-r border-gray-800/60 overflow-y-auto">
          <LeftNav pathname={pathname} />
        </aside>

        {/* Zone 2: Main workspace */}
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
        >
          {/* Mobile: add bottom padding for BottomNav */}
          <div className="px-4 pt-4 pb-24 lg:pb-8 max-w-3xl mx-auto lg:max-w-none lg:px-6 lg:pt-6">
            {children}
          </div>
        </main>

        {/* Zone 3: Tillu sidebar — persistent on desktop, drawer on mobile */}
        <TilluSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pathname={pathname}
        />
      </div>

      {/* ── Mobile bottom navigation ─────────────────────── */}
      <div className="lg:hidden">
        <BottomNav pathname={pathname} />
      </div>

      {/* ── Mobile FAB — Tillu button ─────────────────────── */}
      <div className="lg:hidden">
        <TilluFab onClick={() => setSidebarOpen(true)} />
      </div>

      {/* ── Command palette (global, Cmd+K) ──────────────── */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
      />
    </div>
  );
}
