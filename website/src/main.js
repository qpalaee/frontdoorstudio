import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initIntro } from './intro.js';
import { initServicesProcess } from './services-process.js';
import { initEnding } from './ending.js';

gsap.registerPlugin(ScrollTrigger);

// Phones: the address bar showing/hiding resizes the viewport while scrolling.
// Without this, every resize re-measures the pin and it jumps.
ScrollTrigger.config({ ignoreMobileResize: true });

// One easing family for the whole site. CSS uses the same curve (--ease-out).
const EASE = 'power2.out';

// Both use the pinned "stage" layout from hero.css (motion allowed); the width
// only changes how long the pin lasts.
const DESKTOP_MOTION = '(min-width: 861px) and (prefers-reduced-motion: no-preference)';
const MOBILE_MOTION = '(max-width: 860px) and (prefers-reduced-motion: no-preference)';
const MOTION_OK = '(prefers-reduced-motion: no-preference)';

const scene = document.querySelector('[data-scene]');
const hero = {
  // The photo + drawn slit, and the dust floating in its light.
  bg: [scene.querySelector('[data-scene-media]'), scene.querySelector('[data-hero-dust]')],
  intro: scene.querySelector('[data-hero-intro]'),
  work: scene.querySelector('[data-hero-work]'),
  laptop: scene.querySelector('[data-hero-laptop]'),
  caption: scene.querySelector('[data-hero-caption]'),
};

// The current Lenis instance (null with reduced motion), shared with the intro.
let lenis = null;

// The hero's pin (null with reduced motion, where the laptop is a normal block).
let pinTrigger = null;

/* --------------------------------------------------------------------------
   Smooth scrolling (Lenis), driven by GSAP's clock so both update
   in the same frame and the pin never jitters.
   -------------------------------------------------------------------------- */
function initSmoothScroll() {
  // anchors: clicks on in-page links (#contact, #process…) glide to the section
  // instead of jumping. Same smooth scroll as the mouse wheel.
  lenis = new Lenis({ anchors: true });

  // Every time Lenis moves the page, ScrollTrigger recalculates progress.
  lenis.on('scroll', ScrollTrigger.update);

  // GSAP's ticker gives time in seconds; Lenis expects milliseconds.
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);

  // Without this, GSAP "catches up" after a slow frame and the scroll jumps.
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(raf);
    lenis.destroy();
    lenis = null;
  };
}

/* --------------------------------------------------------------------------
   Pin the scene and scrub one timeline: 200vh of scroll on desktop, 120vh on
   phones (same story, shorter). The timeline is 1 second long, so each
   position below reads as a percentage: 0.25 = 25% of the scroll.
   -------------------------------------------------------------------------- */
function buildPinnedReveal({ distance = '+=200%', rise = 0.5 } = {}) {
  const tl = gsap.timeline({
    defaults: { ease: EASE },
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: distance,
      pin: true,
      scrub: 1, // the animation trails the scroll by ~1s, which feels smooth
      invalidateOnRefresh: true, // recompute the 50vh start on resize
    },
  });

  // 0–30%: the text moves up and fades out. The header stays.
  tl.to(hero.intro, { y: -60, autoAlpha: 0, duration: 0.3 }, 0);

  // Same time: the photo fades to black, so only the laptop remains.
  tl.to(hero.bg, { autoAlpha: 0, duration: 0.3 }, 0);

  // 25–90%: the laptop rises out of the light, tilted back, then settles straight.
  tl.fromTo(
    hero.laptop,
    { y: () => window.innerHeight * rise, rotateX: 25, scale: 0.85, autoAlpha: 0 },
    { y: 0, rotateX: 0, scale: 1, autoAlpha: 1, duration: 0.65 },
    0.25,
  );

  // 85–100%: the caption appears.
  tl.fromTo(hero.caption, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 0.85);

  pinTrigger = tl.scrollTrigger;
  return () => {
    pinTrigger = null;
  };
}

/* --------------------------------------------------------------------------
   "Work" links. #work is inside the pinned scene, so a normal jump lands at
   the top of the pin, where the laptop is still hidden. With the pin, these
   links go to its end instead: laptop and caption fully shown.
   Capture phase, so it runs before Lenis' own anchor handling.
   -------------------------------------------------------------------------- */
function scrollToWork({ immediate = false } = {}) {
  if (!pinTrigger) return false;
  const y = pinTrigger.end;
  if (lenis) lenis.scrollTo(y, { immediate, force: true });
  else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' });
  return true;
}

document.addEventListener(
  'click',
  (event) => {
    const link = event.target.closest?.('a[href="#work"]');
    if (!link || !scrollToWork()) return; // no pin: the normal anchor jump is right
    event.preventDefault();
    event.stopPropagation();
  },
  true,
);

/* --------------------------------------------------------------------------
   matchMedia runs each setup only while its query matches, and undoes it
   (removes the pin, inline styles, Lenis) when the query stops matching,
   e.g. when the window is resized from desktop to phone width.
   -------------------------------------------------------------------------- */
const mm = gsap.matchMedia();

mm.add(DESKTOP_MOTION, () => buildPinnedReveal());
mm.add(MOBILE_MOTION, () => buildPinnedReveal({ distance: '+=120%', rise: 0.35 }));

// Reduced motion: no smooth scroll, no pin, no scrub. CSS shows everything statically.
mm.add(MOTION_OK, initSmoothScroll);

// Services + Process (scrubbed, one traveling light). Created after the hero's pin,
// so their start positions account for the 200vh pin spacer.
initServicesProcess();

// Studio, Contact, Footer (scrubbed).
initEnding();

// Web fonts change text height, which moves the trigger positions: measure again.
// Then, if the page was opened on /#work, go to the shown laptop (see above).
document.fonts.ready.then(() => {
  ScrollTrigger.refresh();
  if (location.hash === '#work') scrollToWork({ immediate: true });
});

// Intro before the hero (once per session). Runs after Lenis exists so it can lock the scroll.
initIntro({ getLenis: () => lenis });
