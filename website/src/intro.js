import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/* --------------------------------------------------------------------------
   Intro: black screen → a line of light grows → it opens like a door →
   the desert photo appears around it and the drawn line hands off to the
   light column in the photo → the hero content arrives. Once per session.
   -------------------------------------------------------------------------- */

const STORAGE_KEY = 'fd-intro-played'; // same key as the inline script in index.html
const MAX_WAIT_MS = 4000; // never leave people on a black screen if the photo is slow

// The light column in the hero photo, as fractions of the photo's size,
// so they stay true at any resolution (828, 1280 or 1672px wide).
const COLUMN = { x: 0.5, top: 322 / 941, bottom: 692 / 941, width: 30 / 1672 };

/* Where the photo's light column is on screen right now.
   The photo is drawn like background-size: cover + position: center bottom,
   inside `el` (the box that holds the background image). */
function column(el, imgW, imgH) {
  const r = el.getBoundingClientRect();
  const s = Math.max(r.width / imgW, r.height / imgH);
  const w = imgW * s;
  const h = imgH * s;
  const offX = r.left + (r.width - w) / 2;
  const offY = r.top + r.height - h; // anchored to the bottom
  const top = offY + COLUMN.top * h;
  const bottom = offY + COLUMN.bottom * h;
  // 0.85: the beam reads slightly wider than the photo's slit because of its glow.
  return { x: offX + COLUMN.x * w, top, h: bottom - top, w: Math.max(6, COLUMN.width * w * 0.85) };
}

function hasPlayed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // storage blocked (private mode…): just play it
  }
}

function markPlayed() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* nothing to do */
  }
}

// Resolves once the photo is loaded and decoded, so the desert never pops in late.
function imageReady(img) {
  const loaded = img.complete
    ? Promise.resolve()
    : new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
  return loaded.then(() => img.decode?.().catch(() => {}));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function initIntro({ getLenis }) {
  const stage = document.querySelector('.intro-stage');
  const bloom = document.querySelector('.intro-bloom');
  const beam = document.querySelector('.intro-beam');
  const skip = document.querySelector('.intro-skip');
  const introEls = [stage, bloom, beam, skip];
  if (!stage) return;

  if (hasPlayed()) {
    introEls.forEach((el) => el?.remove());
    return;
  }
  markPlayed();

  const header = document.querySelector('.site-header');
  const title = document.querySelector('.hero__title');
  const subtitle = document.querySelector('.hero__lead');
  const button = document.querySelector('.hero__cta');
  const bg = document.querySelector('.scene__bg'); // holds the photo; only this one is scaled
  const bgImg = document.querySelector('.scene__bg-img');
  const content = [header, title, subtitle, button];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lock the scroll for the whole intro (there is no Lenis with reduced motion).
  getLenis()?.stop();

  let tl;
  let skipped = false; // Skip can be pressed while the photo is still loading

  function cleanup() {
    window.removeEventListener('resize', finish);
    introEls.forEach((el) => el.remove());
    gsap.set(content, { clearProps: 'all' });
    // Only what the intro set: the scroll reveal also animates this element's opacity.
    gsap.set(bg, { clearProps: 'transform,transformOrigin' });
    getLenis()?.start();
    ScrollTrigger.refresh(); // the scroll reveal measures again on the final layout
  }

  function finish() {
    tl?.progress(1);
  }

  skip.addEventListener('click', () => {
    skipped = true;
    tl?.timeScale(4); // speed up to the end instead of cutting
    skip.disabled = true;
  });

  if (!reducedMotion) {
    // Hidden now, under the black stage, so nothing flashes when it fades.
    gsap.set(content, { autoAlpha: 0, y: 18 });
  }

  await Promise.race([Promise.all([document.fonts.ready, imageReady(bgImg)]), wait(MAX_WAIT_MS)]);

  // Reduced motion: no beam, just fade the black away.
  if (reducedMotion) {
    tl = gsap.timeline({ onComplete: cleanup });
    tl.to(stage, { autoAlpha: 0, duration: 0.6, ease: 'power1.inOut' });
    if (skipped) tl.timeScale(4);
    return;
  }

  const c = column(bg, bgImg.naturalWidth || 1672, bgImg.naturalHeight || 941);
  const bgRect = bg.getBoundingClientRect();

  gsap.set(beam, { x: c.x - c.w / 2, y: c.top, width: c.w, height: c.h, scaleX: 2 / c.w, scaleY: 0, opacity: 1 });
  gsap.set(bloom, {
    x: c.x - c.h * 0.6,
    y: c.top + c.h / 2 - c.h * 0.6,
    width: c.h * 1.2,
    height: c.h * 1.2,
    opacity: 0,
    scale: 0.4,
  });
  // The origin is relative to the element, not the screen.
  gsap.set(bg, { scale: 1.06, transformOrigin: `${c.x - bgRect.left}px ${c.top + c.h / 2 - bgRect.top}px` });

  tl = gsap.timeline({ onComplete: cleanup });
  tl.addLabel('line', 0)
    .to(beam, { scaleY: 1, duration: 1.1, ease: 'expo.inOut' }, 0.2)
    .addLabel('open', 1.25)
    .to(beam, { scaleX: 1, duration: 0.6, ease: 'power3.inOut' }, 'open')
    .to(bloom, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 'open')
    .addLabel('desert', 1.75)
    .to(stage, { autoAlpha: 0, duration: 0.9, ease: 'power1.inOut' }, 'desert')
    .to(bg, { scale: 1, duration: 1.4, ease: 'power3.out' }, 'desert')
    .to(bloom, { opacity: 0, duration: 0.9, ease: 'power1.in' }, 'desert+=0.2')
    .to(beam, { opacity: 0, duration: 0.7, ease: 'power1.in' }, 'desert+=0.35')
    .addLabel('site', 2.45)
    .to(header, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 'site')
    .to([title, subtitle], { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, 'site+=0.05')
    .to(button, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 'site+=0.3');

  if (skipped) tl.timeScale(4);

  // The beam was placed for this screen size: on resize, just finish.
  window.addEventListener('resize', finish);
}
