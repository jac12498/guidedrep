import type { Metadata } from "next";
import { SITE } from "@/lib/site";

// NOTE (app owner): plain-language template, not legal advice. Have counsel
// review and tailor before public/commercial launch.

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms for using ${SITE.name}.`,
};

const UPDATED = "August 11, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-6 text-foreground/90">
        <Section title="Acceptance">
          <p>
            By using {SITE.name} you agree to these terms. If you don&apos;t agree, please
            don&apos;t use the app.
          </p>
        </Section>

        <Section title="Not medical advice — assumption of risk">
          <p>
            {SITE.name} provides general fitness routines for informational purposes only. It is not
            medical advice and is not a substitute for professional medical guidance, diagnosis, or
            treatment. Consult a physician before beginning this or any exercise program.
          </p>
          <p>
            Physical exercise carries inherent risks. By using {SITE.name} you voluntarily assume
            all risks arising from your participation, and you agree to exercise within your own
            limits and stop immediately if you feel unwell. You agree to the in-app health &amp;
            safety disclaimer, which forms part of these terms.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            You are responsible for the accuracy of the information you provide and for activity
            under your account. Keep your email access secure, since sign-in uses a code sent to
            your email.
          </p>
        </Section>

        <Section title="Acceptable use">
          <ul className="list-disc space-y-1 pl-6">
            <li>Don&apos;t misuse, disrupt, or attempt to gain unauthorized access to the service.</li>
            <li>Don&apos;t use the service for any unlawful purpose.</li>
            <li>Don&apos;t resell or redistribute the service without permission.</li>
          </ul>
        </Section>

        <Section title="Plans and billing">
          <p>
            {SITE.name} offers a free plan and a paid Pro plan. Paid features, pricing, and billing
            terms are shown at the point of purchase and may change with notice. Free features are
            provided as-is and may change over time.
          </p>
        </Section>

        <Section title="Disclaimer of warranties &amp; limitation of liability">
          <p>
            The service is provided “as is” and “as available,” without warranties of any kind. To
            the fullest extent permitted by law, {SITE.name} and its creators are not liable for any
            injury, loss, or damages arising out of or related to your use of the app or your
            performance of any exercise.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms from time to time. Continued use after changes take effect
            means you accept the updated terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions? Email{" "}
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
