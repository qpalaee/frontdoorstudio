/* --------------------------------------------------------------------------
   Contact: the text sits above the light slit of the photo, the actions under
   it. The photo always fills the section height, so the slit stays at the same
   % of the height. If the text is taller than the room above the slit (200%
   zoom, larger text settings, a longer title), the section grows instead of
   clipping it: the photo grows with it and the slit stays aligned.
   Without JS the CSS height is used as it is.
   -------------------------------------------------------------------------- */
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const SLIT_TOP = 0.364; // same values as --slit-top / --slit-bottom in ending.css
const SLIT_BOTTOM = 0.659;
const GAP = 28; // space between the slit and the text / actions (ending.css)
const EDGE = 24; // minimum space at the top and bottom of the section

export function initContactFit() {
  const section = document.querySelector('.contact');
  if (!section) return;
  const text = section.querySelector('.contact__text');
  const actions = section.querySelector('.contact__actions');

  let current = '';
  function fit() {
    const before = current;
    section.style.removeProperty('--contact-h');
    const base = section.offsetHeight; // the CSS height (900px, 780px on phones)
    // offsetHeight ignores the transforms of the scroll reveal.
    const forText = (text.offsetHeight + GAP + EDGE) / SLIT_TOP;
    const forActions = (actions.offsetHeight + GAP + EDGE) / (1 - SLIT_BOTTOM);
    const needed = Math.ceil(Math.max(base, forText, forActions));
    current = needed > base ? `${needed}px` : '';
    if (current) section.style.setProperty('--contact-h', current);
    // The footer's scroll trigger sits under this section: measure it again.
    if (current !== before) ScrollTrigger.refresh();
  }

  new ResizeObserver(fit).observe(text);
  new ResizeObserver(fit).observe(actions);
  window.addEventListener('resize', fit);
  fit();
}
