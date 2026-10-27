// Turns the source images in frontdoor-hero-kit/assets into AVIF + WebP + JPG
// (or PNG for transparent cutouts) at several widths, so the browser can pick
// the smallest file it needs.
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
  // Studio portraits: transparent cutouts. The empty space above the hair is
  // trimmed (the top of the image is the top of the hair: the head rises above
  // the card from there). Transparent, so AVIF + WebP with alpha + PNG, no JPG.
  // Cards are at most ~330 CSS px wide, so 960px covers 2x+ screens.
  { file: 'studio-alae.png', name: 'studio-alae', widths: [360, 540, 720, 960], cutout: true },
  { file: 'studio-laila.png', name: 'studio-laila', widths: [360, 540, 720, 960], cutout: true },
];

// Removes the fully transparent rows above the subject (top only).
async function trimTop(path) {
  const { info } = await sharp(path).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const { width, height } = await sharp(path).metadata();
  const top = -info.trimOffsetTop;
  return sharp(path).extract({ left: 0, top, width, height: height - top });
}

await mkdir(OUT, { recursive: true });

const exists = (path) => access(path).then(() => true, () => false);

for (const { file, name, widths, cutout } of jobs) {
  if (!(await exists(`${SRC}/${file}`))) {
    console.log(`– ${file} not found in ${SRC}, skipped`);
    continue;
  }
  // Trimmed once, in memory, then resized for each width.
  const source = cutout
    ? await (await trimTop(`${SRC}/${file}`)).png().toBuffer()
    : `${SRC}/${file}`;
  for (const width of widths) {
    const base = sharp(source).rotate().resize({ width, withoutEnlargement: true }); // rotate(): EXIF orientation
    const out = await Promise.all([
      base.clone().avif({ quality: 55, effort: 6 }).toFile(`${OUT}/${name}-${width}.avif`),
      base.clone().webp({ quality: 78, alphaQuality: 90 }).toFile(`${OUT}/${name}-${width}.webp`),
      cutout
        ? base.clone().png({ compressionLevel: 9, palette: false }).toFile(`${OUT}/${name}-${width}.png`)
        : base.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/${name}-${width}.jpg`),
    ]);
    console.log(`✓ ${name}-${width}  ${out[0].width}x${out[0].height}`);
  }
}
