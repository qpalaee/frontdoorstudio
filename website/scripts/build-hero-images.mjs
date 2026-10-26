// One-off: exports the hero door photo (desktop + mobile) to AVIF and WebP
// at several widths, into public/images/hero/.
// Run: node scripts/build-hero-images.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'src/assets/hero';
const OUT = 'public/images/hero';

const jobs = [
  { file: 'hero-door-desktop.png', name: 'hero-door-desktop', widths: [1600, 2400, 3344] },
  { file: 'hero-door-mobile.png', name: 'hero-door-mobile', widths: [1080, 1536, 2048] },
];

await mkdir(OUT, { recursive: true });

for (const { file, name, widths } of jobs) {
  for (const width of widths) {
    const base = sharp(`${SRC}/${file}`).resize({ width, withoutEnlargement: true });
    const [avif, webp] = await Promise.all([
      base.clone().avif({ quality: 55, effort: 6 }).toFile(`${OUT}/${name}-${width}.avif`),
      base.clone().webp({ quality: 78 }).toFile(`${OUT}/${name}-${width}.webp`),
    ]);
    console.log(`✓ ${name}-${width}  ${avif.width}x${avif.height}  avif ${Math.round(avif.size / 1024)} KB · webp ${Math.round(webp.size / 1024)} KB`);
  }
}
