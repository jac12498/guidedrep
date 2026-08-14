"use client";

import { useState } from "react";
import Link from "next/link";
import { NAV_LINKS, SITE } from "@/lib/site";
import BrandMark from "@/components/BrandMark";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 font-bold" onClick={() => setOpen(false)}>
          <BrandMark className="h-7 w-7" />
          <span>{SITE.name}</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href={SITE.appHref} className="text-sm text-muted hover:text-foreground">
            Sign in
          </Link>
          <Link
            href={SITE.appHref}
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-black transition hover:brightness-110"
          >
            Open the app
          </Link>
        </div>

        <button
          className="rounded-lg border border-border p-2 text-lg md:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border/60 bg-background px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-4 text-sm">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={SITE.appHref}
              className="mt-1 rounded-full bg-brand px-4 py-2.5 text-center font-bold text-black"
              onClick={() => setOpen(false)}
            >
              Open the app
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
