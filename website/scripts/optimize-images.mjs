// Turns the source PNGs in frontdoor-hero-kit/assets into AVIF + WebP + JPG
// at several widths, so the browser can pick the smallest file it needs.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'frontdoor-hero-kit/assets';
const OUT = 'public/assets/images';

const jobs = [
  // The desert image is only 1672px wide: we never upscale it,
  // so the largest version stays at its native width.
  { file: 'hero-desert-door.png', name: 'hero-desert-door', widths: [828, 1280, 1672] },
  // Contact background: the light slit in the dunes (source is 1280px wide).
  { file: 'contact-door.jpg', name: 'contact-door', widths: [828, 1280] },
  // The laptop screen is at most ~1010 CSS px wide, so 2080px covers 2x screens.
  { file: 'stomatolog-screenshot.png', name: 'stomatolog', widths: [640, 1040, 1560, 2080] },
];

await mkdir(OUT, { recursive: true });

for (const { file, name, widths } of jobs) {
  for (const width of widths) {
    const base = sharp(`${SRC}/${file}`).resize({ width, withoutEnlargement: true });
    await Promise.all([
      base.clone().avif({ quality: 55, effort: 6 }).toFile(`${OUT}/${name}-${width}.avif`),
      base.clone().webp({ quality: 78 }).toFile(`${OUT}/${name}-${width}.webp`),
      base.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/${name}-${width}.jpg`),
    ]);
    console.log(`✓ ${name}-${width}`);
  }
}
