// Turns the source PNGs in frontdoor-hero-kit/assets into AVIF + WebP + JPG
// at several widths, so the browser can pick the smallest file it needs.
import sharp from 'sharp';
import { mkdir, access } from 'node:fs/promises';

const SRC = 'frontdoor-hero-kit/assets';
const OUT = 'public/assets/images';

const jobs = [
  // (The hero photo has its own script: scripts/build-hero-images.mjs)
  // Contact background: the light slit in the dunes.
  { file: 'contact-door.jpg', name: 'contact-door', widths: [828, 1280, 1920, 2560] },
  // The laptop screen is at most ~1010 CSS px wide, so 2080px covers 2x screens.
  { file: 'stomatolog-screenshot.png', name: 'stomatolog', widths: [640, 1040, 1560, 2080] },
  // Studio portraits, cropped to 4:5 (the frame in ending.css). Shown at most
  // ~330 CSS px wide, so 960px covers 2x+ screens. Skipped until the files exist.
  { file: 'studio-alae.jpg', name: 'studio-alae', widths: [360, 540, 720, 960], ratio: 4 / 5 },
  { file: 'studio-laila.jpg', name: 'studio-laila', widths: [360, 540, 720, 960], ratio: 4 / 5 },
];

await mkdir(OUT, { recursive: true });

const exists = (path) => access(path).then(() => true, () => false);

for (const { file, name, widths, ratio } of jobs) {
  if (!(await exists(`${SRC}/${file}`))) {
    console.log(`– ${file} not found in ${SRC}, skipped`);
    continue;
  }
  for (const width of widths) {
    const size = ratio
      ? { width, height: Math.round(width / ratio), fit: 'cover', position: 'attention' } // keeps the face in frame
      : { width, withoutEnlargement: true };
    const base = sharp(`${SRC}/${file}`).rotate().resize(size); // rotate(): applies the phone's EXIF orientation
    await Promise.all([
      base.clone().avif({ quality: 55, effort: 6 }).toFile(`${OUT}/${name}-${width}.avif`),
      base.clone().webp({ quality: 78 }).toFile(`${OUT}/${name}-${width}.webp`),
      base.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/${name}-${width}.jpg`),
    ]);
    console.log(`✓ ${name}-${width}`);
  }
}
