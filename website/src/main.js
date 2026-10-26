import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initIntro } from './intro.js';
import { initServicesProcess } from './services-process.js';
import { initEnding } from './ending.js';

gsap.registerPlugin(ScrollTrigger);

// One easing family for the whole site. CSS uses the same curve (--ease-out).
const EASE = 'power2.out';

// These two queries must stay in sync with the media queries in hero.css.
const DESKTOP_MOTION = '(min-width: 861px) and (prefers-reduced-motion: no-preference)';
const MOBILE_MOTION = '(max-width: 860px) and (prefers-reduced-motion: no-preference)';
const MOTION_OK = '(prefers-reduced-motion: no-preference)';

const scene = document.querySelector('[data-scene]');
const hero = {
  // The photo + drawn slit, and the dust floating in its light.
  bg: [scene.querySelector('[data-scene-media]'), scene.querySelector('[data-hero-dust]')],
  intro: scene.querySelector('[data-hero-intro]'),
  work: scene.querySelector('[data-hero-work]'),
  glow: scene.querySelector('[data-hero-glow]'),
  laptop: scene.querySelector('[data-hero-laptop]'),
  caption: scene.querySelector('[data-hero-caption]'),
};

// The current Lenis instance (null with reduced motion), shared with the intro.
let lenis = null;

/* --------------------------------------------------------------------------
   Smooth scrolling (Lenis), driven by GSAP's clock so both update
   in the same frame and the pin never jitters.
   -------------------------------------------------------------------------- */
function initSmoothScroll() {
  lenis = new Lenis();

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
   Desktop: pin the scene and scrub one timeline over 200vh of scroll.
   The timeline is 1 second long, so each position below reads as a
   percentage: 0.25 = 25% of the scroll.
   -------------------------------------------------------------------------- */
function buildPinnedReveal() {
  const tl = gsap.timeline({
    defaults: { ease: EASE },
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: '+=200%',
      pin: true,
      scrub: 1, // the animation trails the scroll by ~1s, which feels smooth
      invalidateOnRefresh: true, // recompute the 50vh start on resize
    },
  });

  // 0–30%: the text moves up and fades out. The header stays.
  tl.to(hero.intro, { y: -60, autoAlpha: 0, duration: 0.3 }, 0);

  // Same time: the photo fades to black, so only the laptop remains.
  tl.to(hero.bg, { autoAlpha: 0, duration: 0.3 }, 0);

  // 15–60%: "the door opens" (the thin column widening into a broad glow).
  // DISABLED until the reveal is redone: it grew from the old centered light
  // column, which the new door photo doesn't have (its slit is left of center).
  // tl.fromTo(hero.glow, { scaleX: 0.12, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: 0.45, ease: 'power2.inOut' }, 0.15);

  // 25–90%: the laptop rises out of the light, tilted back, then settles straight.
  tl.fromTo(
    hero.laptop,
    { y: () => window.innerHeight * 0.5, rotateX: 25, scale: 0.85, autoAlpha: 0 },
    { y: 0, rotateX: 0, scale: 1, autoAlpha: 1, duration: 0.65 },
    0.25,
  );

  // 85–100%: the caption appears.
  tl.fromTo(hero.caption, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 0.85);
}

/* --------------------------------------------------------------------------
   Phones: no pin. The laptop simply rises and fades in as it enters the screen.
   -------------------------------------------------------------------------- */
function buildMobileReveal() {
  const tl = gsap.timeline({
    defaults: { ease: EASE },
    scrollTrigger: {
      trigger: hero.work,
      start: 'top 90%', // when the top of the block is near the bottom of the screen
      end: 'top 30%',
      scrub: 1,
    },
  });

  // Glow widening disabled for now (see buildPinnedReveal).
  tl.fromTo(hero.laptop, { y: 80, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 }, 0.1)
    .fromTo(hero.caption, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.8);
}

/* --------------------------------------------------------------------------
   matchMedia runs each setup only while its query matches, and undoes it
   (removes the pin, inline styles, Lenis) when the query stops matching,
   e.g. when the window is resized from desktop to phone width.
   -------------------------------------------------------------------------- */
const mm = gsap.matchMedia();

mm.add(DESKTOP_MOTION, buildPinnedReveal);
mm.add(MOBILE_MOTION, buildMobileReveal);

// Reduced motion: no smooth scroll, no pin, no scrub. CSS shows everything statically.
mm.add(MOTION_OK, initSmoothScroll);

// Services + Process (scrubbed, one traveling light). Created after the hero's pin,
// so their start positions account for the 200vh pin spacer.
initServicesProcess();

// Studio, Contact, Footer (scrubbed).
initEnding();

// Web fonts change text height, which moves the trigger positions: measure again.
document.fonts.ready.then(() => ScrollTrigger.refresh());

// Intro before the hero (once per session). Runs after Lenis exists so it can lock the scroll.
initIntro({ getLenis: () => lenis });
