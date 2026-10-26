import gsap from 'gsap';
import { createDust } from './dust.js';

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
  const title = scene.querySelector('.hero__title');
  const subtitle = scene.querySelector('.hero__lead');
  const button = scene.querySelector('.hero__cta');
  const slits = {
    portrait: scene.querySelector('.door-ink--mobile .door-ink__slit'),
    landscape: scene.querySelector('.door-ink--desktop .door-ink__slit'),
  };

  let slit = null; // the slit drawn for the current orientation
  const dust = createDust(canvas, () => slit, scene);
  let introStarted = false;
  let tl = null;

  skip.addEventListener('click', () => tl?.progress(1));

  function showFinal() {
    root.classList.remove('intro-pending', 'intro-running');
    dust.state.level = 1;
    dust.start();
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
      gsap.set([header, title, subtitle, button], { autoAlpha: 0, y: 16 });
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
        gsap.set([header, title, subtitle, button, picture, skip], { clearProps: 'all' });
        gsap.set(media, { clearProps: 'transform' });
        gsap.set(slit, { clearProps: 'all' }); // back to the CSS default: hidden
        getLenis()?.start();
      }

      imageReady(img).then(() => {
        if (cancelled) return;
        // ctx.add: the timeline belongs to this matchMedia context, so a
        // rotation kills it and reverts its styles before the rebuild.
        ctx.add(() => {
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
            .to(picture, { autoAlpha: 1, duration: 1.5, ease: 'power2.in' }, 'open+=0.15')
            .to(media, { scale: 1, duration: 2.2, ease: 'power3.out' }, 'open')
            .to(slit, { autoAlpha: 0, duration: 0.6, ease: 'power1.inOut' }, 'open+=1.2')
            .to(dust.state, { level: 1, duration: 1.6, ease: 'power1.inOut' }, 'open+=0.6')
            .addLabel('site', 2.7)
            .set(skip, { autoAlpha: 0 }, 'site')
            .to(header, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 'site')
            .to(
              [title, subtitle],
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
