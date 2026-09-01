"use client";

/**
 * Tillu Floating Action Button — mobile only (UI spec §96).
 * Opens the Tillu sidebar drawer.
 */
export function TilluFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 shadow-lg shadow-violet-900/40 flex items-center justify-center transition-colors"
      aria-label="Open Tillu chat"
    >
      <span className="text-xl" aria-hidden>🧠</span>
    </button>
  );
}
