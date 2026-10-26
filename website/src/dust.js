/* --------------------------------------------------------------------------
   Dust floating in the light of the door, drawn on a <canvas>.
   Particles live in a field around the slit (wider on the left, where the
   side rays are) and are only visible where the light is.
   -------------------------------------------------------------------------- */

const rand = Math.random;
const clamp = (min, value, max) => Math.min(max, Math.max(min, value));

function makeParticle(v = rand()) {
  return {
    u: rand(),
    v,
    r: 0.5 + rand() ** 2 * 1.6,
    vx: (rand() - 0.65) * 0.00018,
    vy: -(0.00004 + rand() * 0.00016),
    phase: rand() * Math.PI * 2,
    twinkle: 0.6 + rand() * 1.6,
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {() => Element | null} getSlit  returns the visible `.door-ink__slit`
 * @param {Element} observeEl  pauses the loop when this element is off-screen
 */
export function createDust(canvas, getSlit, observeEl) {
  const ctx = canvas.getContext('2d');
  const state = { level: 0 }; // animated by the intro (0 → 1)
  let particles = [];
  let dpr = 1;
  let width = 0;
  let height = 0;
  let rafId = 0;
  let running = false;
  let onScreen = true;
  let lastTime = 0;

  function resize() {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const count = Math.round(clamp(55, (width * height) / 9000, 110));
    while (particles.length < count) particles.push(makeParticle());
    particles.length = count;
    if (!running && state.level) draw(performance.now(), 0); // keep the still frame
  }

  function draw(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const slit = getSlit();
    if (!slit) return;
    const canvasBox = canvas.getBoundingClientRect();
    const s = slit.getBoundingClientRect();
    const h = s.height;
    if (!h) return;

    // Slit on the canvas
    const cx = s.left - canvasBox.left + s.width / 2;
    const top = s.top - canvasBox.top;
    const bottom = top + h;
    const centerY = top + h / 2;

    // Particle field: wider on the left of the slit, where the side rays are
    const fieldX = cx - 0.95 * h;
    const fieldW = 1.3 * h;
    const fieldY = top - 0.55 * h;
    const fieldH = bottom + 0.08 * h - fieldY;

    const step = dt / (1000 / 60); // speeds are per frame at 60fps

    for (const p of particles) {
      p.u += p.vx * step;
      p.v += p.vy * step;
      if (p.v < 0) {
        p.v = 1;
        p.u = rand();
      }
      p.u = ((p.u % 1) + 1) % 1;

      const x = fieldX + p.u * fieldW + Math.sin(t / 1400 + p.phase) * 4;
      const y = fieldY + p.v * fieldH;

      const dx = (x - cx) / (0.42 * h);
      const dy = Math.max(0, Math.abs(y - centerY) - h / 2) / (0.3 * h);
      const lit = Math.exp(-(dx * dx + dy * dy));
      const twinkle = 0.55 + 0.45 * Math.sin((t / 1000) * p.twinkle + p.phase);
      const alpha = lit * twinkle * state.level * 0.9;
      if (alpha < 0.02) continue;

      ctx.fillStyle = `rgba(255, ${Math.round(210 + 30 * lit)}, ${Math.round(150 + 70 * lit)}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(t) {
    const dt = lastTime ? Math.min(t - lastTime, 100) : 16.7;
    lastTime = t;
    draw(t, dt);
    rafId = requestAnimationFrame(frame);
  }

  function shouldRun() {
    return running && onScreen && !document.hidden;
  }

  function sync() {
    if (shouldRun() && !rafId) {
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    } else if (!shouldRun() && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  });
  observer.observe(observeEl);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', resize);
  resize();

  return {
    state,
    /** Starts the animation loop. */
    start() {
      running = true;
      sync();
    },
    /** Draws a single still frame (reduced motion). */
    still() {
      running = false;
      sync();
      draw(performance.now(), 0);
    },
    destroy() {
      running = false;
      sync();
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
