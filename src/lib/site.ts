// Single source of truth for marketing copy: brand, navigation, pricing, and
// the feature/step lists shared across the landing and pricing pages.

export const SITE = {
  name: "Guided Reps",
  domain: "guidedreps.com",
  tagline: "A coach that talks you through every rep.",
  subtagline:
    "Hands-free voice cues and a personalized plan that adapts to you — so you can just move and listen.",
  appHref: "/app",
  startHref: "/start",
  email: "hello@guidedreps.com",
  builtBy: "Cardinal Technology",
} as const;

export const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export interface Feature {
  icon: string;
  title: string;
  body: string;
}

export const FEATURES: Feature[] = [
  {
    icon: "🔊",
    title: "Hands-free voice coach",
    body: "Spoken cues and beeps call every set, rep, and rest — in the coach voice and personality you pick. Put the phone down and just follow along; the screen stays awake so it never sleeps mid-workout.",
  },
  {
    icon: "🗓️",
    title: "Your personalized 12-week program",
    body: "The Pro centerpiece: a plan calibrated to what you can do today, with three different sessions a week across four phases. It adapts mid-program and rebuilds harder when you finish a block.",
  },
  {
    icon: "✨",
    title: "Personalized routines, free",
    body: "Answer a few quick questions and get starter routines matched to your goal, level, and equipment — re-run the quiz anytime to refresh them. No credit card.",
  },
  {
    icon: "🎙️",
    title: "Voice commands",
    body: "Control the whole session without touching the screen: “pause,” “continue,” “next,” “back,” “restart,” “instructions.”",
  },
  {
    icon: "📖",
    title: "Know every move",
    body: "Written how-tos the coach can read aloud, plus a one-tap “watch on YouTube” search for anything new.",
  },
  {
    icon: "📈",
    title: "Streaks & progress",
    body: "Day streaks, total workouts, and minutes trained keep you showing up. Pro adds detailed charts and your place in the 12-week plan.",
  },
];

export interface Step {
  n: string;
  title: string;
  body: string;
}

export const STEPS: Step[] = [
  {
    n: "1",
    title: "Open it and press start",
    body: "Answer a few quick questions for a personalized routine — or open today's program day. Install it to your home screen and it works offline like a native app.",
  },
  {
    n: "2",
    title: "Put the phone down",
    body: "The coach talks you through each move, counts your work and rest, and tells you what's next. Your hands stay free.",
  },
  {
    n: "3",
    title: "Show up tomorrow",
    body: "Every session is logged. Your streak grows, the program progresses, and you always know the next thing to do.",
  },
];

export interface Tier {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  cta: string;
  /** Where the CTA goes: the free signup funnel, or straight into Pro checkout. */
  href: string;
  featured: boolean;
  features: string[];
  note?: string;
}

export const PRICE_PRO_MONTHLY = 5;
export const PRICE_PRO_ANNUAL = 40; // ~$3.33/mo, billed yearly
export const TRIAL_DAYS = 7;
export const AI_FREE_LIMIT = 3; // free AI generations before Pro is required

/**
 * Whether Pro *purchase* CTAs are shown. Set `NEXT_PUBLIC_PRO_ENABLED=false` for a
 * Free-first soft launch: all upgrade CTAs become "coming soon" and the checkout
 * route is blocked, so visitors never hit a not-yet-live/test-mode payment. Unset
 * (or any value other than "false") = Pro is live. Existing Pro subscribers keep
 * their access and billing management regardless.
 */
export function proPurchaseEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRO_ENABLED !== "false";
}

export const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Personalized routines and the full hands-free coach.",
    cta: "Start free",
    href: "/start",
    featured: false,
    features: [
      "Personalized routines from a quick quiz",
      "Re-run the quiz anytime to refresh them",
      "Hands-free voice coach — pick your coach",
      "Voice commands & exercise how-tos",
      "3 built-in routines",
      "History, streaks & a synced account",
      "Installable PWA — works offline",
    ],
  },
  {
    name: "Pro",
    price: `$${PRICE_PRO_MONTHLY}`,
    cadence: "per month",
    blurb: "Your personalized 12-week program that adapts as you go.",
    cta: `Start ${TRIAL_DAYS}-day free trial`,
    href: "/app/go-pro?plan=monthly",
    featured: true,
    note: `then $${PRICE_PRO_MONTHLY}/mo, or $${PRICE_PRO_ANNUAL}/year — save ${Math.round(
      (1 - PRICE_PRO_ANNUAL / (PRICE_PRO_MONTHLY * 12)) * 100,
    )}%`,
    features: [
      "Everything in Free",
      "Personalized 12-week program",
      "Calibrated to what you can do today",
      "Adapts mid-program & rebuilds each block",
      "Progress charts & detailed stats",
      "Custom routine builder",
      "Export your data (CSV & JSON)",
    ],
  },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Do I need any equipment?",
    a: "No. Everything is bodyweight-first — a resistance band or dumbbells just unlock more movement variety. Both your free routines and the Pro program are calibrated to whatever you have.",
  },
  {
    q: "Does it really work hands-free?",
    a: "Yes — that's the whole point. Spoken cues drive the session and optional voice commands let you pause, resume, and skip without touching the screen. Great for phones propped across the room.",
  },
  {
    q: "Is my data private?",
    a: "Your account data is stored securely and isolated to you with row-level security — no one else can read it, and we never sell it. You can delete your data at any time.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: `Free is a complete hands-free coach with personalized starter routines you can refresh anytime, plus history and streaks. Pro adds your personalized 12-week program — calibrated to what you can do today, with three different sessions a week that adapt as you progress and rebuild when you finish a block — plus progress charts, a custom routine builder, and data export. Pro starts with a ${TRIAL_DAYS}-day free trial.`,
  },
  {
    q: "Is this medical or fitness advice?",
    a: "No. Guided Reps provides general fitness routines for information only, not medical advice. Everyone agrees to a health & safety disclaimer before training, and you should talk to a physician before starting any program.",
  },
];
