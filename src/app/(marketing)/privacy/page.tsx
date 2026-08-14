import type { Metadata } from "next";
import { SITE } from "@/lib/site";

// NOTE (app owner): plain-language template, not legal advice. Have counsel
// review and tailor before public/commercial launch.

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} handles your data.`,
};

const UPDATED = "August 11, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated {UPDATED}</p>

      <div className="prose-invert mt-8 space-y-6 text-foreground/90">
        <Section title="The short version">
          <p>
            {SITE.name} is designed to collect as little as possible. If you use it without an
            account, your routines and history stay on your device. If you create an account, we
            store only what&apos;s needed to run the app and sync your data. We don&apos;t sell your
            data, and we don&apos;t show ads.
          </p>
        </Section>

        <Section title="Local mode (no account)">
          <p>
            Without an account, your routines, workout history, and program progress are saved in
            your browser&apos;s local storage on your device. This data never leaves your device and
            we can&apos;t see it. Clearing your browser storage removes it.
          </p>
        </Section>

        <Section title="With an account">
          <p>When you create an account, we store:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Your email address (to sign you in) and the name you provide.</li>
            <li>The date and version of the health &amp; safety disclaimer you agreed to.</li>
            <li>Your routines, workout logs, and program progress, so they sync across devices.</li>
          </ul>
          <p>
            Authentication and storage are provided by Supabase. Your account data is isolated to
            you through row-level security. Sign-in emails are sent via our email provider.
          </p>
        </Section>

        <Section title="AI routine generation">
          <p>
            When you generate a routine, the preferences you enter (time, focus, equipment, and
            notes) are sent to our AI provider to produce the routine. Don&apos;t include sensitive
            personal information in those fields.
          </p>
        </Section>

        <Section title="What we don't do">
          <ul className="list-disc space-y-1 pl-6">
            <li>We don&apos;t sell or rent your personal information.</li>
            <li>We don&apos;t use third-party advertising trackers.</li>
            <li>We don&apos;t share your data except with the service providers above, as needed to run the app.</li>
          </ul>
        </Section>

        <Section title="Your choices">
          <p>
            You can request deletion of your account and associated data at any time by emailing{" "}
            <a href={`mailto:${SITE.email}`} className="text-brand hover:underline">
              {SITE.email}
            </a>
            . You can also stop using an account and rely on local mode only.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy? Email{" "}
            <a href={`mailto:${SITE.email}`} className="text-brand hover:underline">
              {SITE.email}
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
