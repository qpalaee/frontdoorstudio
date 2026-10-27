import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* --------------------------------------------------------------------------
   Services + Process: everything follows the scroll (scrub), no pin.
   Reveals use opacity, not autoAlpha, so the buttons stay reachable with Tab.
   One soft light travels from under the Services cards to the start of the
   Process line, then runs along it and lights each step.
   -------------------------------------------------------------------------- */
// Opacity of a process step before the light reaches it. 0.7 is about the lowest that
// keeps its text readable (4.5:1 for --ink-muted on the page black, checked by Lighthouse).
const UNLIT = 0.7;

export function initServicesProcess() {
  const scene = document.querySelector('.light-scene');
  if (!scene) return;
  const services = scene.querySelector('#services');
  const cards = scene.querySelector('.services__cards');
  const line = scene.querySelector('.process__line');

  // Position of an element inside the scene (the light is positioned in the scene).
  const rel = (el) => {
    const s = scene.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  };
  // The light starts just UNDER the cards, not behind them: behind the frosted
  // glass it looked blurred inside each card and sharp outside, so it seemed
  // cut by the card edges ("a rectangle"). 170px ≈ the visible radius of its glow.
  const startPos = () => {
    const c = rel(cards);
    return { x: c.x + c.w / 2, y: c.y + c.h + 170 };
  };
  const endPos = () => {
    const l = rel(line);
    return { x: l.x + 10, y: l.y };
  };

  const mm = gsap.matchMedia();
  mm.add({ motion: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 861px)' }, (ctx) => {
    const { motion, wide } = ctx.conditions;
    gsap.set('.light-travel', { x: () => startPos().x, y: () => startPos().y, scaleX: 1, scaleY: 1, opacity: 1 });
    if (!motion) return; // reduced motion: static, everything visible

    // Services builds with the scroll.
    // Built paused, then attached: created inline, ScrollTrigger re-measures the
    // page while the from() tweens are added (because of the hero's pin) and their
    // hidden states get lost, so Services would show before the reveal.
    const servicesTl = gsap
      .timeline({ paused: true, defaults: { ease: 'power2.out' } })
      .from('.services__eyebrow', { opacity: 0, y: 16, duration: 0.3 })
      .from('.services__word', { opacity: 0, y: 80, scale: 0.94, duration: 1 }, 0.05)
      .from('.services__card', { opacity: 0, y: 120, duration: 0.8, stagger: 0.18 }, 0.45)
      .from('.services__footer', { opacity: 0, y: 20, duration: 0.4 }, 1.2);
    ScrollTrigger.create({ trigger: services, start: 'top 85%', end: 'top 10%', scrub: 0.6, animation: servicesTl });

    // The light travels from under the cards to the start of the line
    gsap
      .timeline({
        scrollTrigger: {
          trigger: cards,
          start: 'bottom 75%',
          endTrigger: line,
          end: 'top 60%',
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      })
      .fromTo(
        '.light-travel',
        { x: () => startPos().x, y: () => startPos().y, scaleX: 1, scaleY: 1 },
        {
          x: () => (wide ? endPos().x : startPos().x * 0.4 + 24),
          y: () => endPos().y,
          scaleX: wide ? 0.62 : 0.5,
          scaleY: wide ? 0.32 : 0.5,
          ease: 'power1.inOut',
        },
      )
      // It rises out of the dark under the cards instead of being already there.
      .fromTo('.light-travel', { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'none' }, 0);

    if (wide) {
      // The light runs along the line and lights each step
      gsap.set('.process__lit', { scaleX: 0 });
      gsap.set('.process__step', { opacity: UNLIT });
      gsap.set('.process__dot i', { opacity: 0 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: line, start: 'top 62%', end: 'top 25%', scrub: 0.6 } });
      tl.to('.process__lit', { scaleX: 1, ease: 'none', duration: 1 }, 0).to(
        '.light-travel',
        { x: () => endPos().x + line.offsetWidth * 0.1, opacity: 0.55, ease: 'none', duration: 1 },
        0,
      );
      gsap.utils.toArray('.process__step').forEach((step, i) => {
        const at = [0.02, 0.27, 0.53, 0.8][i];
        tl.to(step, { opacity: 1, duration: 0.12 }, at).to(
          step.querySelector('.process__dot i'),
          { opacity: 1, duration: 0.08 },
          at,
        );
      });
    } else {
      // Phones: the same idea, vertical. The line fills down the left side, and
      // each step slides up, fades in and lights its dot when the line reaches it.
      const steps = gsap.utils.toArray('.process__step');
      gsap.set('.process__lit', { scaleY: 0 });
      gsap.set(steps, { opacity: UNLIT, y: 24 });
      gsap.set('.process__dot i', { opacity: 0 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: line, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
      });
      tl.to('.process__lit', { scaleY: 1, ease: 'none', duration: 1 }, 0);
      steps.forEach((step, i) => {
        const at = (i / steps.length) * 0.95;
        tl.to(step, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }, at).to(
          step.querySelector('.process__dot i'),
          { opacity: 1, duration: 0.08 },
          at,
        );
      });
    }
  });
  // Font loading re-measures every trigger once, in main.js.
}
