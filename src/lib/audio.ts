// Hands-free audio: spoken cues via the Web Speech API and beeps via WebAudio.
// Both are best-effort — if a browser lacks support the workout still runs silently.

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Must be called from a user gesture (e.g. the Start button) to unlock audio
 * on mobile browsers, which otherwise block sound until first interaction.
 */
export function unlockAudio(): void {
  const c = ctx();
  if (c && c.state === "suspended") void c.resume();
  // Prime speech synthesis with a silent utterance so the first real cue is instant.
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

/** Short sine beep. freq in Hz, duration in ms. */
export function beep(freq = 880, ms = 150, volume = 0.25): void {
  const c = ctx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(c.destination);
  const now = c.currentTime;
  // Small fade-out to avoid clicks.
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
  osc.start(now);
  osc.stop(now + ms / 1000);
}

/** A rising two-tone "go" chime. */
export function chimeGo(): void {
  beep(660, 120);
  window.setTimeout(() => beep(990, 180), 130);
}

/** A soft single tick for the final countdown seconds. */
export function tick(): void {
  beep(520, 90, 0.18);
}

// ---- Coach voice selection ----

export interface VoiceProfile {
  gender: "female" | "male" | "any";
  voiceNames: string[];
  rate: number;
  pitch: number;
}

const DEFAULT_PROFILE: VoiceProfile = {
  gender: "female",
  voiceNames: ["Samantha", "Google US English"],
  rate: 1.02,
  pitch: 1,
};

// Substrings that hint a voice's gender (device voices don't expose it directly).
const FEMALE_HINTS = ["samantha", "karen", "victoria", "moira", "tessa", "fiona", "female", "zira", "susan", "allison", "ava", "serena", "kate", "aria", "jenny", "sonia", "libby", "michelle", "nicky"];
const MALE_HINTS = ["daniel", "aaron", "alex", "fred", "david", "mark", "male", "guy", "tom", "james", "george", "ryan", "arthur", "rishi", "oliver", "thomas", "gordon", "reed"];

function genderOf(name: string): "female" | "male" | "any" {
  const n = name.toLowerCase();
  if (FEMALE_HINTS.some((k) => n.includes(k))) return "female";
  if (MALE_HINTS.some((k) => n.includes(k))) return "male";
  return "any";
}

let profile: VoiceProfile = DEFAULT_PROFILE;
let cachedVoice: SpeechSynthesisVoice | null = null;

/** Set the active coach's voice preference; clears the resolved-voice cache. */
export function setCoachVoice(p: VoiceProfile): void {
  profile = p;
  cachedVoice = null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Voices populate asynchronously; drop the cache so it re-resolves once they do.
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = null;
  });
}

function resolveVoice(p: VoiceProfile): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // 1) preferred names, most-wanted first
  for (const nm of p.voiceNames) {
    const v = voices.find((vc) => vc.name.toLowerCase().includes(nm.toLowerCase()));
    if (v) return v;
  }
  const en = voices.filter((v) => /^en/i.test(v.lang));
  // 2) gender heuristic among English voices
  if (p.gender !== "any") {
    const g = en.find((v) => genderOf(v.name) === p.gender);
    if (g) return g;
  }
  // 3) any English voice, else anything
  return en[0] ?? voices[0] ?? null;
}

function voiceForActive(): SpeechSynthesisVoice | null {
  if (!cachedVoice) cachedVoice = resolveVoice(profile);
  return cachedVoice;
}

/** Speak text, cancelling anything queued so cues never pile up. */
export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = profile.rate;
    u.pitch = profile.pitch;
    const v = voiceForActive();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore — silent fallback
  }
}

/**
 * Speak a short cue WITHOUT interrupting whatever's already talking — used for
 * mid-set rep counts and countdowns. If the coach is mid-sentence (or a cue is
 * queued), this one is dropped so counts stay on-beat and never pile up.
 */
export function speakSoft(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!text) return;
  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = Math.min(2, profile.rate * 1.05); // counts a touch quicker
    u.pitch = profile.pitch;
    const v = voiceForActive();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore — silent fallback
  }
}

/** Preview a line in a specific voice profile without changing the active one. */
export function speakAs(text: string, p: VoiceProfile): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = p.rate;
    u.pitch = p.pitch;
    const v = resolveVoice(p);
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
