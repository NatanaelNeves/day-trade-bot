"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

const LINKS = [
  { href: "/", label: "Backtest" },
  { href: "/paper", label: "Paper ao vivo" },
];

export default function NavBar() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-strong text-white shadow-[0_2px_10px_-2px_rgba(124,108,255,0.6)] transition-transform duration-200 group-hover:scale-105">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 17l6-6 4 4 8-8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 7v4M21 7h-4"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Bot de Trade <span className="font-normal text-faint">· B3</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-line bg-surface/70 p-1 text-sm backdrop-blur">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-1.5 font-medium transition-colors duration-150",
                  active ? "text-fg" : "text-muted hover:text-fg"
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-elevated shadow-sm" />
                )}
                <span className="relative flex items-center gap-1.5">
                  {l.href === "/paper" && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        active ? "bg-pos" : "bg-faint"
                      )}
                    />
                  )}
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
