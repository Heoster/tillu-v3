import Link from "next/link";

/**
 * Mobile bottom navigation — 5 primary tabs (UI spec §96).
 * Hidden on desktop (lg+).
 */

const TABS = [
  { href: "/home",     icon: "🏠", label: "Home"     },
  { href: "/plan",     icon: "📅", label: "Plan"     },
  { href: "/study",    icon: "📖", label: "Study"    },
  { href: "/revision", icon: "🧠", label: "Revision" },
  { href: "/progress", icon: "📊", label: "Progress" },
] as const;

interface Props { pathname: string; }

export function BottomNav({ pathname }: Props) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-gray-950/95 backdrop-blur border-t border-gray-800/60 safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center py-2 gap-0.5 transition-colors ${
                  active ? "text-violet-400" : "text-gray-500 hover:text-gray-300"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-lg leading-none" aria-hidden>{tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
