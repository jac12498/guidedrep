"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Today", icon: "🏠" },
  { href: "/app/program", label: "Program", icon: "🗓️" },
  { href: "/app/routines", label: "Routines", icon: "📋" },
  { href: "/app/history", label: "History", icon: "📈" },
];

export default function BottomNav() {
  const pathname = usePathname();
  // Hide the nav inside an active session, and on the login screen.
  if (
    pathname.startsWith("/app/session/") ||
    pathname.startsWith("/app/program/day/") ||
    pathname === "/app/login" ||
    pathname === "/app/onboarding"
  )
    return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {TABS.map((tab) => {
          const active =
            tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  active ? "text-brand" : "text-muted hover:text-foreground"
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
