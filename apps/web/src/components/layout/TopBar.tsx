import Link from "next/link";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur border-b border-gray-800/60 px-4 h-12 flex items-center justify-between">
      <span className="text-indigo-400 font-bold text-lg">Tillu</span>
      <div className="flex items-center gap-3">
        {/* System health dot */}
        <div
          className="w-2 h-2 rounded-full bg-green-400"
          title="System healthy"
          aria-label="System healthy"
        />
        <Link
          href="/settings"
          className="text-gray-400 hover:text-white text-sm transition-colors"
          aria-label="Settings"
        >
          ⚙️
        </Link>
      </div>
    </header>
  );
}
