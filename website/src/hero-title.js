/**
 * Hero title: "We OPEN doors for brands."
 *
 * The big word OPEN is drawn as SVG on top of the hero photo, in the photo's own
 * pixel coordinates, so it scales and crops exactly like the image (object-fit: cover).
 * The door is a second copy of the photo clipped to the door polygon and drawn
 * above the letters, so OP sits to the left of the door and EN to the right.
 *
 * During the intro both halves start as dark silhouettes. A wide, soft wave of
 * light paints them outward from the slit: OP gets the warm "lit" gradient,
 * EN only reaches its shadow colour (it is behind the door, away from the light).
 */
import { gsap } from 'gsap';
import { GLYPHS, CAP_HEIGHT } from './hero-title-glyphs.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Scene geometry, in pixels of each source image.
 * desktop: measured on hero-desktop (3344x1882).
 * mobile:  MUST be measured on hero-mobile (2048x3072) — see the README.
 */
export const SCENES = {
  desktop: {
    width: 3344,
    height: 1882,
    horizon: 1150, // y of the line where the sand meets the black wall
    slitX: 1612, // centre of the bright slit
    doorRight: 1788, // right edge of the door leaf
    // Door leaf outline (the dark panel), clockwise from top-left.
    door: [
      [1596, 686], [1626, 668], [1700, 680], [1788, 692],
      [1788, 1153], [1596, 1153],
    ],
  },
  // Measured on hero-door-mobile.png (2048x3072) with the same method that gives
  // the desktop values above (horizon 1150, slit 1612, door right 1788).
  mobile: {
    width: 2048,
    height: 3072,
    horizon: 1859,
    slitX: 973,
    doorRight: 1214,
    door: [
      [950, 1117], [990, 1096], [1100, 1110], [1214, 1126],
      [1214, 1862], [950, 1862],
    ],
  },
};

const CONFIG = {
  capToDoor: 0.84, // letter cap height as a share of door height
  gapLeft: 8, // px (image space) between P and the slit, at desktop scale
  gapRight: 42, // px between the door and E, at desktop scale
  sideMargin: 0.05, // keep the word inside 5% of the visible width on each side
  featherRatio: 2.72, // wave width relative to cap height (about 1100px at desktop scale)
  paintDuration: 1.8, // seconds
  // Portrait photo: the door is narrow and right of center, so the room for EN
  // (between the door and the right edge) limits the size of the whole word.
  portraitSideMargin: 0.02, // 2% of the visible width on each side (5% looked tiny)
};

const COLORS = {
  silhouetteOP: '#24170c',
  silhouetteEN: '#1a1008',
  lit: [
    [0, '#fffaf0'], [0.07, '#FFE7C2'], [0.25, '#F2C07A'], [0.6, '#7d522b'], [1, '#2a1a0e'],
  ],
  shade: [[0, '#6e4826'], [0.45, '#4a2f18'], [1, '#2a1a0e']],
};

/* ---------- helpers ---------- */

const el = (name, attrs = {}, children = []) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  children.forEach((c) => node.appendChild(c));
  return node;
};

const stops = (list) =>
  list.map(([offset, color]) => el('stop', { offset, 'stop-color': color }));

/**
 * Convert a glyph path from font units (y up) to scene units (y down).
 * The coordinates are baked into the path instead of using a transform, because
 * gradientUnits="userSpaceOnUse" resolves in the coordinate system of the element
 * that is painted. With a transform the gradients would land far away from the door.
 */
function bakePath(d, tx, ty, scale) {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const X = (v) => (tx + v * scale).toFixed(1);
  const Y = (v) => (ty - v * scale).toFixed(1);
  let out = '';
  let cmd = '';
  let i = 0;
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) { cmd = t; out += t; i = 0; continue; }
    const v = Number(t);
    if (cmd === 'H') out += `${X(v)} `;
    else if (cmd === 'V') out += `${Y(v)} `;
    else { out += `${i % 2 === 0 ? X(v) : Y(v)} `; i += 1; }
  }
  return out.trim();
}

function wordPaths(text, x, baseline, scale, alignEnd) {
  const width = [...text].reduce((sum, ch) => sum + GLYPHS[ch].adv, 0) * scale;
  let cursor = alignEnd ? x - width : x;
  const start = cursor;
  const paths = [...text].map((ch) => {
    const p = el('path', { d: bakePath(GLYPHS[ch].d, cursor, baseline, scale) });
    cursor += GLYPHS[ch].adv * scale;
    return p;
  });
  return { paths, start, end: start + width };
}

/** Part of the image that is actually visible with object-fit: cover. */
function visibleSpan(scene, box) {
  const imgRatio = scene.width / scene.height;
  const boxRatio = box.width / box.height;
  if (boxRatio >= imgRatio) return { x0: 0, x1: scene.width };
  const visible = scene.height * boxRatio;
  const x0 = (scene.width - visible) / 2;
  return { x0, x1: x0 + visible };
}

/* ---------- main ---------- */

/**
 * The file the <picture> loaded, if it is the photo of this scene. Right after a
 * rotation the <img> still shows the other orientation's file until the new one
 * loads, so the orientation of the loaded image is checked against the scene.
 */
function loadedSrc(img, scene) {
  if (!img.currentSrc || !img.naturalWidth) return null;
  const imgPortrait = img.naturalHeight > img.naturalWidth;
  const scenePortrait = scene.height > scene.width;
  return imgPortrait === scenePortrait ? img.currentSrc : null;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.mount   Element that holds the hero photo (same box, same transforms).
 * @param {HTMLImageElement} opts.img  The hero <img>. Its loaded file is reused for the door copy.
 * @param {string} opts.mobileQuery  Same media query the <picture> uses to switch to the portrait image.
 */
export function createHeroTitle({ mount, img, mobileQuery = '(max-aspect-ratio: 3/4)' }) {
  const mq = window.matchMedia(mobileQuery);
  const svg = el('svg', {
    class: 'hero-title-svg',
    'aria-hidden': 'true',
    focusable: 'false',
    preserveAspectRatio: 'xMidYMid slice',
  });
  mount.appendChild(svg);

  const state = { progress: 0, layout: null };

  function build() {
    const scene = mq.matches ? SCENES.mobile : SCENES.desktop;
    const src = loadedSrc(img, scene);
    // The photo of this orientation is still loading: build again once it is there.
    if (!src) img.addEventListener('load', build, { once: true });
    const box = mount.getBoundingClientRect();
    const { x0, x1 } = visibleSpan(scene, box);

    // Size: tied to the door height, then reduced if the word would leave the visible area.
    const doorTop = Math.min(...scene.door.map(([, y]) => y));
    const doorH = scene.horizon - doorTop;
    let scale = (doorH * CONFIG.capToDoor) / CAP_HEIGHT;
    const k = () => scale / 0.54; // spacing was tuned at desktop scale 0.54
    const opW = (GLYPHS.O.adv + GLYPHS.P.adv) * scale;
    const enW = (GLYPHS.E.adv + GLYPHS.N.adv) * scale;
    const side = scene === SCENES.mobile ? CONFIG.portraitSideMargin : CONFIG.sideMargin;
    const margin = (x1 - x0) * side;
    const roomLeft = scene.slitX - CONFIG.gapLeft * k() - (x0 + margin);
    const roomRight = x1 - margin - (scene.doorRight + CONFIG.gapRight * k());
    const fit = Math.min(1, roomLeft / opW, roomRight / enW);
    if (fit < 1) scale *= fit;

    const opEnd = scene.slitX - CONFIG.gapLeft * k();
    const enStart = scene.doorRight + CONFIG.gapRight * k();
    const feather = CAP_HEIGHT * scale * CONFIG.featherRatio;

    svg.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`);
    svg.replaceChildren();

    const lit = el('radialGradient', {
      id: 'ht-lit', gradientUnits: 'userSpaceOnUse',
      cx: scene.slitX - 32, cy: scene.horizon - 190, fx: scene.slitX, fy: scene.horizon - 190,
      r: scene.width * 0.434,
    }, stops(COLORS.lit));
    const shade = el('linearGradient', {
      id: 'ht-shade', gradientUnits: 'userSpaceOnUse',
      x1: enStart, y1: 0, x2: enStart + 1270 * k(), y2: 0,
    }, stops(COLORS.shade));

    // Paint masks: white = painted. OP is revealed from the door to the left, EN to the right.
    const waveOP = el('linearGradient', { id: 'ht-wave-op', gradientUnits: 'userSpaceOnUse', y1: 0, y2: 0 },
      stops([[0, '#000'], [1, '#fff']]));
    const waveEN = el('linearGradient', { id: 'ht-wave-en', gradientUnits: 'userSpaceOnUse', y1: 0, y2: 0 },
      stops([[0, '#fff'], [1, '#000']]));
    const maskAttrs = (id) => ({
      id, maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse',
      x: 0, y: 0, width: scene.width, height: scene.height,
    });
    const full = (fill) => el('rect', { x: 0, y: 0, width: scene.width, height: scene.height, fill });

    const clip = el('clipPath', { id: 'ht-door', clipPathUnits: 'userSpaceOnUse' }, [
      el('polygon', { points: scene.door.map((p) => p.join(',')).join(' ') }),
    ]);

    svg.appendChild(el('defs', {}, [
      lit, shade, waveOP, waveEN, clip,
      el('mask', maskAttrs('ht-mask-op'), [full('url(#ht-wave-op)')]),
      el('mask', maskAttrs('ht-mask-en'), [full('url(#ht-wave-en)')]),
    ]));

    const op = wordPaths('OP', opEnd, scene.horizon, scale, true);
    const en = wordPaths('EN', enStart, scene.horizon, scale, false);
    const clone = (list) => list.map((p) => p.cloneNode());

    svg.append(
      el('g', { fill: COLORS.silhouetteOP }, op.paths),
      el('g', { fill: 'url(#ht-lit)', mask: 'url(#ht-mask-op)' }, clone(op.paths)),
      el('g', { fill: COLORS.silhouetteEN }, en.paths),
      el('g', { fill: 'url(#ht-shade)', mask: 'url(#ht-mask-en)' }, clone(en.paths)),
    );
    // The door, cut from the same photo, sits above the letters.
    if (src) {
      svg.append(el('image', {
        href: src, width: scene.width, height: scene.height,
        'clip-path': 'url(#ht-door)', preserveAspectRatio: 'none',
      }));
    }

    state.layout = { waveOP, waveEN, opStart: op.start, opEnd, enStart, enEnd: en.end, feather };
    render(state.progress);
  }

  /** p: 0 = both halves dark, 1 = OP fully lit and EN in its shadow colour. */
  function render(p) {
    const L = state.layout;
    if (!L) return;
    const a0 = L.opEnd + 40;
    const a1 = L.opStart - L.feather - 40;
    const edgeOP = a0 + (a1 - a0) * p;
    L.waveOP.setAttribute('x1', edgeOP.toFixed(1));
    L.waveOP.setAttribute('x2', (edgeOP + L.feather).toFixed(1));

    const b0 = L.enStart - 40;
    const b1 = L.enEnd + L.feather + 40;
    const edgeEN = b0 + (b1 - b0) * p;
    L.waveEN.setAttribute('x1', (edgeEN - L.feather).toFixed(1));
    L.waveEN.setAttribute('x2', edgeEN.toFixed(1));
  }

  build();

  let resizeFrame = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(build);
  };
  window.addEventListener('resize', onResize);
  mq.addEventListener('change', build);

  return {
    /** Tween to drop into the intro master timeline. */
    paint(duration = CONFIG.paintDuration) {
      return gsap.to(state, {
        progress: 1,
        duration,
        ease: 'power2.out',
        onUpdate: () => render(state.progress),
      });
    },
    /** Final look, for skip, reduced motion, and repeat visits in the same session. */
    setFinal() {
      state.progress = 1;
      render(1);
    },
    destroy() {
      window.removeEventListener('resize', onResize);
      img.removeEventListener('load', build);
      mq.removeEventListener('change', build);
      svg.remove();
    },
  };
}
