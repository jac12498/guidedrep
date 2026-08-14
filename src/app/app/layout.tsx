import type { Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import CloudSync from "@/components/CloudSync";

// The app zone locks zoom (it's a fixed, phone-first UI). The marketing site,
// which uses the root layout, keeps normal pinch-to-zoom for accessibility.
export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-24 pt-6">{children}</main>
      <BottomNav />
      <RegisterSW />
      <CloudSync />
    </>
  );
}
