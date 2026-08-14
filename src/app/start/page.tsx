import type { Metadata } from "next";
import StartClient from "@/components/StartClient";

export const metadata: Metadata = {
  title: "Build your free routine",
  description:
    "Answer a few quick questions and get a personalized workout routine — free, no card required.",
};

// Public, pre-signup. Middleware only gates /app/*, so this stays open.
export default function StartPage() {
  return <StartClient />;
}
