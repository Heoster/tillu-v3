"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home",     label: "Home",     icon: "🏠" },
  { href: "/plan",     label: "Plan",     icon: "📅" },
  { href: "/study",    label: "Study",    icon: "📖" },
  { href: "/revision", label: "Revision", icon: "🧠" },
  { href: "/progress", label: "Progress", icon: "📊" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-900 border-t border-gray-800 z-50"
      aria-label="Main navigation"
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center py-2 gap-0.5 transition-colors ${
                  active
                    ? "text-indigo-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-lg" aria-hidden="true">{tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
