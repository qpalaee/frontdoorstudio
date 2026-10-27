/* --------------------------------------------------------------------------
   Header: fixed on the whole page (styles in src/styles/header.css).

   - At rest while the hero is on screen (up to the end of its pin):
     transparent, exactly like before.
   - After the hero: .is-scrolled (a background), hidden while scrolling down,
     shown again as soon as the user scrolls up.
   - Phones: the menu button opens a modal <dialog>. showModal() keeps focus
     inside it and closes it with Escape; the page scroll (Lenis) is stopped
     while it is open.
   -------------------------------------------------------------------------- */

import { ScrollTrigger } from 'gsap/ScrollTrigger';

const DESKTOP = '(min-width: 861px)'; // same breakpoint as the CSS
const DELTA = 2; // px of scroll before the header reacts (ignores jitter)

/**
 * @param {object} opts
 * @param {() => import('lenis').default | null} opts.getLenis
 * @param {() => number} opts.getRestEnd  scroll position where the hero ends
 */
export function initHeader({ getLenis, getRestEnd }) {
  const root = document.documentElement;
  const header = document.querySelector('[data-site-header]');
  if (!header) return;
  if (!header.dataset.style) header.dataset.style = 'bar';

  /* ---------- scroll states ---------- */

  let lastY = window.scrollY;
  let frame = 0;

  function update() {
    frame = 0;
    const y = window.scrollY;
    const end = getRestEnd(); // NaN until ScrollTrigger has measured the pin
    const atRest = y <= (Number.isFinite(end) ? end : Infinity) + 1;
    header.classList.toggle('is-scrolled', !atRest);
    if (atRest || menu.open) header.classList.remove('is-hidden');
    else if (y > lastY + DELTA) header.classList.add('is-hidden');
    else if (y < lastY - DELTA) header.classList.remove('is-hidden');
    lastY = y;
  }

  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  ScrollTrigger.addEventListener('refresh', onScroll); // the pin end moved

  /* ---------- phone menu ---------- */

  const menu = header.querySelector('[data-menu]');
  const openButton = header.querySelector('[data-menu-open]');
  const closeButton = menu.querySelector('[data-menu-close]');

  function onClosed() {
    openButton.setAttribute('aria-expanded', 'false');
    root.classList.remove('menu-open');
    getLenis()?.start();
  }

  function openMenu() {
    if (menu.open) return;
    menu.showModal();
    openButton.setAttribute('aria-expanded', 'true');
    root.classList.add('menu-open');
    getLenis()?.stop();
  }

  function closeMenu() {
    if (!menu.open) return;
    menu.close(); // focus goes back to the menu button
    onClosed(); // now, not on the async 'close' event: a link click must scroll right away
  }

  openButton.addEventListener('click', openMenu);
  closeButton.addEventListener('click', closeMenu);
  // Escape (the dialog's own 'cancel'), or any other way it gets closed.
  menu.addEventListener('close', onClosed);
  // A link in the menu: close it, then the normal (Lenis) anchor scroll runs.
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  // Rotating or resizing to desktop width: the menu doesn't exist there.
  window.matchMedia(DESKTOP).addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });

  update();
}
