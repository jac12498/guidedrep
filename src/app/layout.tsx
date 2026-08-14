import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://guidedreps.com"),
  title: {
    default: "Guided Reps — your hands-free workout coach",
    template: "%s · Guided Reps",
  },
  description:
    "Guided Reps talks you through every workout — timed cues, a 12-week program, and AI-built routines. Hands-free, installable, works offline.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Guided Reps" },
  openGraph: {
    title: "Guided Reps — your hands-free workout coach",
    description:
      "A coach that talks you through every rep. Timed cues, a 12-week program, and AI-built routines — hands-free.",
    url: "https://guidedreps.com",
    siteName: "Guided Reps",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="no-overscroll min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
