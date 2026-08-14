// The Guided Reps mark: an open progress ring with an upward arrow. Cyan ring +
// light arrow, on transparent — for use inline next to the wordmark. The full
// dark-background app icon lives in public/icon.svg.
export default function BrandMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <path
        d="M15 34.7 A14 14 0 1 1 33 34.7"
        stroke="#22d3ee"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M24 31 V17.5 M18.3 23.2 L24 17.5 L29.7 23.2"
        stroke="#f0f9ff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
