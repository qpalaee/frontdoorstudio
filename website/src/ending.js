import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Builds the timeline paused, then attaches its ScrollTrigger. Created inline,
// ScrollTrigger re-measures the page while the tweens are added (because of the
// hero's pin) and the from() states get lost, so things show before their reveal.
function scrubbed(trigger, start, end, build) {
  const tl = build(gsap.timeline({ paused: true }));
  ScrollTrigger.create({ trigger, start, end, scrub: 0.6, animation: tl });
}

/* --------------------------------------------------------------------------
   Studio, Contact, Footer: scrubbed with the scroll, no pin.
   Only transform and opacity move (smooth on phones).
   -------------------------------------------------------------------------- */
export function initEnding() {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Studio: text first, then the two photos rise at different speeds
    scrubbed('#studio', 'top 80%', 'top 20%', (tl) =>
      tl
        .from('#studio .studio__text > *', { autoAlpha: 0, y: 30, stagger: 0.1, duration: 0.5 }, 0)
        .from('#studio figure:nth-child(1)', { autoAlpha: 0, y: 120, duration: 0.8 }, 0.15)
        .from('#studio figure:nth-child(2)', { autoAlpha: 0, y: 180, duration: 0.8 }, 0.3),
    );

    // Contact: the night lifts and the light appears, then the text and the button
    scrubbed('#contact', 'top 85%', 'top 15%', (tl) =>
      tl
        .fromTo('#contact .contact__shade', { opacity: 0.85 }, { opacity: 0, duration: 1 }, 0)
        .from('#contact .contact__text > *', { autoAlpha: 0, y: 30, stagger: 0.1, duration: 0.5 }, 0.2)
        .from('#contact .contact__actions', { autoAlpha: 0, y: 40, duration: 0.5 }, 0.55),
    );

    // Footer: the door opens one last time, FRONT and DOOR slide apart from the light
    scrubbed('footer', 'top 90%', 'bottom bottom', (tl) =>
      tl
        .from('.footer__slit', { scaleX: 0, opacity: 0, duration: 0.6 }, 0)
        .from('.footer__front', { xPercent: 12, opacity: 0.2, duration: 1 }, 0)
        .from('.footer__door', { xPercent: -12, opacity: 0.2, duration: 1 }, 0),
    );
  });
}
