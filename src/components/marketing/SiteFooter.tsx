import Link from "next/link";
import { SITE } from "@/lib/site";
import BrandMark from "@/components/BrandMark";

// Server component — the current year is stamped at request/build time (no
// client-only Date that would cause a hydration mismatch).
export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 font-bold">
              <BrandMark className="h-7 w-7" />
              <span>{SITE.name}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{SITE.tagline}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <FooterCol title="Product">
              <FooterLink href="/#features">Features</FooterLink>
              <FooterLink href="/#how">How it works</FooterLink>
              <FooterLink href="/pricing">Pricing</FooterLink>
              <FooterLink href={SITE.appHref}>Open the app</FooterLink>
            </FooterCol>
            <FooterCol title="Company">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href={`mailto:${SITE.email}`}>Contact</FooterLink>
            </FooterCol>
            <FooterCol title="Legal">
              <FooterLink href="/privacy">Privacy</FooterLink>
              <FooterLink href="/terms">Terms</FooterLink>
            </FooterCol>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {SITE.name}. Built by {SITE.builtBy}.
          </span>
          <span>Not medical advice. Train within your limits.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 font-semibold text-foreground">{title}</div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-muted transition-colors hover:text-foreground">
        {children}
      </Link>
    </li>
  );
}
