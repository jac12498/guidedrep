// Short, plain-language how-to for each movement, plus a YouTube search query so
// the user can pull up a demo video. Matching is by keyword on the movement's base
// name (set/side suffixes stripped), so all push-up / squat variants share one entry.

interface Instruction {
  text: string;
  /** Search query for "Watch on YouTube" (a search URL — always valid, nothing to curate). */
  query: string;
}

/** Strip "(left)", "— set 1/2", etc. down to the base movement name. */
export function baseName(name: string): string {
  return name
    .replace(/—.*$/, "")
    .replace(/\(.*?\)/g, "")
    .replace(/,.*$/, "")
    .trim();
}

// Ordered: more specific keywords first.
const RULES: Array<{ match: (n: string) => boolean; text: string }> = [
  {
    match: (n) => n.includes("march"),
    text: "Stand tall and jog gently on the spot, lifting each knee to a comfortable height and swinging your arms. Keep it light — this is a warm-up, not a workout.",
  },
  {
    match: (n) => n.includes("shoulder roll"),
    text: "Roll both shoulders in big, slow circles — several backward, then several forward. Keep your arms relaxed and breathe easily.",
  },
  {
    match: (n) => n.includes("arm circle"),
    text: "Extend your arms out to your sides and draw circles, starting small and growing larger. Do one direction, then reverse.",
  },
  {
    match: (n) => n.includes("torso rotation"),
    text: "Feet hip-width apart, arms loose. Gently rotate your upper body left and right, letting your arms swing naturally. Keep it relaxed.",
  },
  {
    match: (n) => n.includes("hip circle"),
    text: "Hands on hips, feet apart. Make big, slow circles with your hips as if using a hula hoop. Switch directions halfway through.",
  },
  {
    match: (n) => n.includes("leg swing"),
    text: "Hold a wall or chair for support. Swing one leg forward and back in a smooth, controlled arc, then switch legs. Don't force the range.",
  },
  {
    match: (n) => n.includes("heel raise"),
    text: "Stand tall, feet hip-width, holding support if you like. Rise up onto the balls of your feet, pause, then lower slowly.",
  },
  {
    match: (n) => n.includes("split squat") || n.includes("lunge"),
    text: "Stand in a split stance — one foot forward, one back — holding a chair for balance. Lower straight down by bending both knees until your back knee nears the floor, then push back up. Keep your front knee over your ankle. Finish all reps on one leg, then switch.",
  },
  {
    match: (n) => n.includes("slow squat") || n.includes("chair squat"),
    text: "Feet shoulder-width, toes slightly out. Push your hips back and bend your knees, chest up, knees tracking over your toes. For a chair squat, lightly tap the seat then stand; for a slow squat, take about three seconds to lower, pause, then stand normally. Drive up through your heels.",
  },
  {
    match: (n) => n.includes("squat"),
    text: "Feet shoulder-width, toes slightly out. Push your hips back and bend your knees to lower down, keeping your chest up and knees tracking over your toes. Go as low as is comfortable, then drive up through your heels. Aim for effort 6–7 out of 10.",
  },
  {
    match: (n) => n.includes("push-up") || n.includes("push up"),
    text: "Hands slightly wider than your shoulders on the surface in the name — wall, countertop, table, bench, or floor. Keep your body in a straight line from head to heels, elbows tucked at about 45 degrees. Lower until your chest nears the surface, then press back up. Use the level where 8–12 clean reps are challenging.",
  },
  {
    match: (n) => n.includes("glute bridge") || n === "bridge",
    text: "Lie on your back, knees bent, feet flat and hip-width apart. Push through your heels to lift your hips into a straight line from knees to shoulders. Squeeze your glutes at the top, pause, then lower slowly.",
  },
  {
    match: (n) => n.includes("calf raise"),
    text: "Stand tall, feet hip-width, holding support if needed. Rise onto the balls of your feet as high as you can, pause, then lower slowly. To progress, shift toward one leg at a time.",
  },
  {
    match: (n) => n.includes("bird dog"),
    text: "On hands and knees — hands under shoulders, knees under hips. Reach your opposite arm and leg out until both are level with your back, hips square and core braced. Hold briefly, return, and switch sides.",
  },
  {
    match: (n) => n.includes("plank"),
    text: "Rest your forearms on the floor or a countertop, elbows under your shoulders. Make your body one straight line from head to heels, bracing your core and squeezing your glutes — no sagging or piking. A higher surface makes it easier.",
  },
  {
    match: (n) => n.includes("band row") || n.includes("row"),
    text: "Anchor the band securely at about chest height and stand facing it, arms extended. Pull your elbows straight back, squeezing your shoulder blades together, then return slowly. Stay upright with your shoulders down. Pick a band where the last 2–3 reps are hard but your form holds.",
  },
  {
    match: (n) => n.includes("heel-to-toe"),
    text: "Stand with one foot directly in front of the other, heel touching toe, as if on a tightrope. Hold tall and steady, next to something you can grab.",
  },
  {
    match: (n) => n.includes("narrow-stance"),
    text: "Stand with your feet together, arms relaxed, next to support. Hold steady and tall — the narrow base is what challenges your balance.",
  },
  {
    match: (n) => n.includes("balance"),
    text: "Stand next to something you can grab. Shift your weight onto one foot and lift the other slightly off the floor. Stand tall and hold, touching the support only if you need it.",
  },
  {
    match: (n) => n.includes("hip-flexor"),
    text: "Kneel on one knee (or stand in a lunge) and gently push your hips forward until you feel a stretch at the front of the back leg's hip and thigh. Stay upright. Hold, then switch sides.",
  },
  {
    match: (n) => n.includes("hamstring"),
    text: "With one leg extended and a soft knee, hinge forward from your hips until you feel a stretch down the back of the thigh. Keep your back long rather than rounding hard. Hold, then switch.",
  },
  {
    match: (n) => n.includes("quad"),
    text: "Standing near support, bend one knee and hold that ankle behind you, drawing the heel toward your glute. Keep your knees together and stand tall. Hold, then switch.",
  },
  {
    match: (n) => n.includes("calf stretch"),
    text: "Step one foot back, keeping it straight with the heel down, and lean into a wall until you feel a stretch in the back calf. Hold, then switch.",
  },
  {
    match: (n) => n.includes("chest stretch"),
    text: "Place a forearm on a doorway or wall at shoulder height and gently turn your body away until you feel a stretch across the chest. Hold, then switch sides.",
  },
  {
    match: (n) => n.includes("upper-back"),
    text: "Clasp your hands in front of you, round your upper back, and reach forward to separate your shoulder blades. Hold and breathe.",
  },
  {
    match: (n) => n.includes("spinal rotation"),
    text: "Seated or standing, gently rotate your upper body to one side and hold, then the other. Keep it slow and comfortable.",
  },
  {
    match: (n) => n.includes("walk") || n.includes("brisk") || n.includes("recovery"),
    text: "Walk at the pace in the name. 'Easy' is a comfortable, conversational pace. 'Brisk' means you're clearly working but could still speak in short sentences — exercising, not catching a bus. For intervals, alternate a brisk minute with easy walking to recover.",
  },
];

export function instructionsFor(name: string): Instruction {
  const base = baseName(name);
  const n = base.toLowerCase();
  const rule = RULES.find((r) => r.match(n));
  return {
    text: rule?.text ?? "Perform the movement slowly and with control, keeping good form. Stop if anything is painful.",
    query: `${base} exercise how to`,
  };
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
