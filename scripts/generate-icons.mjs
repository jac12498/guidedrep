// Rasterize public/icon.svg into the PNG sizes browsers and phones need.
// Run after editing the icon:  npm run icons
//
//   apple-touch-icon.png  180  iOS home screen (must be PNG, no transparency)
//   icon-192.png          192  Android / PWA install
//   icon-512.png          512  PWA splash / high-DPI
//
// The source icon is full-bleed dark, so the same art works as "any maskable".

import sharp from "sharp";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
const svg = fs.readFileSync(`${publicDir}icon.svg`);

const TARGETS = [
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
];

for (const { file, size } of TARGETS) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(`${publicDir}${file}`);
  console.log(`✓ ${file}  ${size}×${size}`);
}

console.log("\nDone. Icons written to public/.");
