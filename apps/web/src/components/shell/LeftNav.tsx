import Link from "next/link";

/**
 * Left navigation — full nav map from UI spec §123.
 * Desktop only (hidden on mobile).
 */

const PRIMARY_NAV = [
  { href: "/home",        icon: "🏠", label: "Home" },
  { href: "/plan",        icon: "📅", label: "Plan" },
  { href: "/study",       icon: "📖", label: "Study" },
  { href: "/revision",    icon: "🧠", label: "Revision" },
  { href: "/tests",       icon: "📝", label: "Tests" },
  { href: "/lectures",    icon: "🎬", label: "Lectures" },
  { href: "/research",    icon: "🔎", label: "Research" },
  { href: "/mistakes",    icon: "❌", label: "Mistakes" },
  { href: "/formulas",    icon: "🔢", label: "Formulas" },
  { href: "/progress",    icon: "📊", label: "Progress" },
] as const;

const SECONDARY_NAV = [
  { href: "/tillu-brain", icon: "🧠", label: "Tillu Brain" },
  { href: "/settings",    icon: "⚙️",  label: "Settings" },
] as const;

interface Props {
  pathname: string;
}

export function LeftNav({ pathname }: Props) {
  return (
    <nav className="flex flex-col h-full py-3" aria-label="Primary navigation">
      {/* Primary nav items */}
      <ul className="flex-1 space-y-0.5 px-2">
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
      </ul>

      {/* Divider */}
      <div className="my-2 mx-4 border-t border-gray-800" aria-hidden />

      {/* Tillu Chat shortcut */}
      <div className="px-2 mb-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-violet-400 text-sm font-medium">
          <span className="text-base" aria-hidden>💬</span>
          <span>Tillu Chat</span>
          <span className="ml-auto text-[10px] text-gray-600 font-mono border border-gray-700 rounded px-1">⌘K</span>
        </div>
      </div>

      {/* Secondary nav */}
      <ul className="space-y-0.5 px-2">
        {SECONDARY_NAV.map((item) => (
          <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
      </ul>
    </nav>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href:   string;
  icon:   string;
  label:  string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
          active
            ? "bg-violet-900/30 text-violet-300"
            : "text-gray-400 hover:text-white hover:bg-gray-800/60"
        }`}
        aria-current={active ? "page" : undefined}
      >
        <span className="text-base w-5 text-center" aria-hidden>{icon}</span>
        <span>{label}</span>
      </Link>
    </li>
  );
}
