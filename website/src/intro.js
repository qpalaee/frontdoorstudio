import gsap from 'gsap';
import { createDust } from './dust.js';
import { createHeroTitle } from './hero-title.js';

/* --------------------------------------------------------------------------
   Intro (first visit of the session): black screen → the door's slit
   flickers on → it opens and the photo appears around it, dust starts to
   float in the light → the header and the hero text arrive.
   -------------------------------------------------------------------------- */

const STORAGE_KEY = 'fd-intro-seen'; // same key as the inline script in index.html
const MAX_WAIT_MS = 4000; // never leave people on a black screen if the photo is slow

function hasSeen() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* storage blocked: the intro will just play again next time */
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Resolves once the photo is decoded, so it never pops in late.
function imageReady(img) {
  const decoded = img.decode ? img.decode() : Promise.resolve();
  return Promise.race([decoded.catch(() => {}), wait(MAX_WAIT_MS)]);
}

export function initIntro({ getLenis }) {
  const root = document.documentElement;
  const scene = document.querySelector('[data-scene]');
  const media = scene.querySelector('[data-scene-media]');
  const picture = scene.querySelector('[data-hero-picture]');
  const img = picture.querySelector('img');
  const canvas = scene.querySelector('[data-hero-dust]');
  const skip = scene.querySelector('[data-intro-skip]');
  const header = scene.querySelector('.site-header');
  const titleLines = scene.querySelectorAll('[data-hero-reveal]'); // "We", "doors for brands.", subtitle
  const button = scene.querySelector('.hero__cta');
  const slits = {
    portrait: scene.querySelector('.door-ink--mobile .door-ink__slit'),
    landscape: scene.querySelector('.door-ink--desktop .door-ink__slit'),
  };

  let slit = null; // the slit drawn for the current orientation
  const dust = createDust(canvas, () => slit, scene);
  let introStarted = false;
  let tl = null;

  // The big OPEN, drawn on the photo. Created once the photo is decoded; it reads
  // the file the <picture> actually loaded (and again after a rotation), so the
  // door copy in the SVG is the same cached file, whatever format the browser picked.
  const PORTRAIT = '(orientation: portrait)'; // same query as the portrait <source>
  let heroTitle = null;
  const heroTitleReady = imageReady(img).then(() => {
    heroTitle = createHeroTitle({ mount: media, img, mobileQuery: PORTRAIT });
    return heroTitle;
  });

  skip.addEventListener('click', () => {
    tl?.progress(1);
    heroTitle?.setFinal();
  });

  function showFinal() {
    root.classList.remove('intro-pending', 'intro-running');
    dust.state.level = 1;
    dust.start();
    heroTitleReady.then((title) => title.setFinal());
  }

  // Rotating the device rebuilds this with the SVG of the new orientation.
  const mm = gsap.matchMedia();
  mm.add(
    {
      portrait: '(orientation: portrait)',
      landscape: '(orientation: landscape)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { portrait, reduceMotion } = ctx.conditions;
      slit = portrait ? slits.portrait : slits.landscape;

      // Reduced motion: no intro, still dust, final state directly.
      if (reduceMotion) {
        root.classList.remove('intro-pending', 'intro-running');
        dust.state.level = 1;
        dust.still();
        heroTitleReady.then((title) => title.setFinal());
        return;
      }

      // Already seen this session, or rotated mid-intro: final state directly.
      if (hasSeen() || introStarted) {
        markSeen();
        showFinal();
        return;
      }
      introStarted = true;

      // Start states. The CSS default is the final state (works without JS).
      gsap.set(slit, { autoAlpha: 0, scaleX: 0.08, transformOrigin: '0% 50%' });
      gsap.set(picture, { autoAlpha: 0 });
      gsap.set([header, ...titleLines, button], { autoAlpha: 0, y: 16 });
      gsap.set(media, { scale: 1.05, transformOrigin: '50% 55%' });
      gsap.set(skip, { autoAlpha: 1 });
      dust.state.level = 0;
      root.classList.remove('intro-pending');
      root.classList.add('intro-running');
      getLenis()?.stop(); // no scrolling while the door opens

      let cancelled = false;

      function done() {
        markSeen();
        root.classList.remove('intro-running');
        gsap.set([header, ...titleLines, button, picture, skip], { clearProps: 'all' });
        gsap.set(media, { clearProps: 'transform' });
        gsap.set(slit, { clearProps: 'all' }); // back to the CSS default: hidden
        gsap.set(media.querySelector('.hero-title-svg'), { clearProps: 'opacity,visibility' });
        getLenis()?.start();
      }

      heroTitleReady.then((heroTitle) => {
        if (cancelled) return;
        // ctx.add: the timeline belongs to this matchMedia context, so a
        // rotation kills it and reverts its styles before the rebuild.
        ctx.add(() => {
          // The big OPEN and its copy of the door are hidden at the start, like the
          // photo: on black, only the slit shows, then the door opens, then they
          // all appear together with the photo.
          const titleSvg = media.querySelector('.hero-title-svg');
          gsap.set(titleSvg, { autoAlpha: 0 });
          dust.start();
          tl = gsap.timeline({ onComplete: done });
          tl.addLabel('closed', 0)
            .addLabel('line', 0.35)
            .to(
              slit,
              {
                keyframes: [
                  { autoAlpha: 0.7, duration: 0.06 },
                  { autoAlpha: 0.2, duration: 0.07 },
                  { autoAlpha: 0.9, duration: 0.05 },
                  { autoAlpha: 0.5, duration: 0.08 },
                  { autoAlpha: 1, duration: 0.1 },
                ],
                ease: 'none',
              },
              'line',
            )
            .addLabel('open', 1.15)
            .to(slit, { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 'open')
            .to([picture, titleSvg], { autoAlpha: 1, duration: 1.5, ease: 'power2.in' }, 'open+=0.15')
            .to(media, { scale: 1, duration: 2.2, ease: 'power3.out' }, 'open')
            .to(slit, { autoAlpha: 0, duration: 0.6, ease: 'power1.inOut' }, 'open+=1.2')
            .to(dust.state, { level: 1, duration: 1.6, ease: 'power1.inOut' }, 'open+=0.6')
            // OPEN is painted by a wave of light from the slit, from open+0.4 to open+2.2.
            .add(heroTitle.paint(1.8), 'open+=0.4')
            // The reveal step waits until the paint is ~80% done (open + 0.4 + 1.44 ≈ 3.0).
            // It was at 2.7 before the new title; slit and photo timings are unchanged.
            .addLabel('site', 3.0)
            .set(skip, { autoAlpha: 0 }, 'site')
            .to(header, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 'site')
            .to(
              titleLines,
              { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' },
              'site+=0.05',
            )
            .to(button, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 'site+=0.3');

          // Dev only: ?introAt=2.15 freezes the intro at that time (to compare
          // the drawn slit with the photo's slit). Ignored in the production build.
          if (import.meta.env.DEV) {
            const at = Number(new URLSearchParams(location.search).get('introAt'));
            if (at) tl.pause(at);
          }
        });
      });

      return () => {
        cancelled = true;
        tl = null;
        root.classList.remove('intro-running');
        getLenis()?.start();
      };
    },
  );
}
