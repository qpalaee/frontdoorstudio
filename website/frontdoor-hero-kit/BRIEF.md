# Frontdoor Studio — Hero + scroll reveal (build brief)

Read this whole file, look at everything in `assets/` and `reference/`, then build.

## Who I am and how I want you to work

- I'm Alae, a self-taught web developer (The Odin Project, Foundations done, vanilla JS). This is the portfolio site of **Frontdoor Studio**, the web + social media studio I'm launching in Morocco with my partner. Clients: local businesses (dental clinics first, then car rentals, restaurants…).
- Write **real, industry-level, professional code**. Do not simplify it to my level.
- I must **understand every line**. After each file (or each logical part), explain the concepts I probably haven't learned yet (for example: ScrollTrigger, `pin`, `scrub`, GSAP timelines, Lenis, CSS custom properties, `prefers-reduced-motion`, `will-change`, `srcset`).
- **Explain in Moroccan Darija, written in Arabic script**, and keep technical terms in English (property, scroll, pin, timeline…). Start sentences with Arabic words where possible.
- Ask me before adding anything that is not in this brief.

## Scope (only this, nothing else yet)

Build **only the hero section and its scroll reveal**, as one page. Below the hero, add one plain placeholder section (100vh, text "Next section") so the scroll can be tested. The other sections will be designed and built later, one by one.

## Stack

- Vite + vanilla HTML / CSS / JavaScript (ES modules). No framework, no Tailwind.
- `gsap` (with `ScrollTrigger`) for the animation, `lenis` for smooth scrolling. Install with npm.
- Fonts from Google Fonts: **Unbounded** (500), **Jost** (300, 400), **IBM Plex Mono** (400).
- Suggested structure: `index.html`, `src/main.js`, `src/styles/` (`tokens.css`, `base.css`, `hero.css`), `public/assets/`. Copy my `assets/` into `public/assets/` and optimize the images (WebP or AVIF + `srcset`, keep a PNG/JPG fallback).
- Class names in BEM style. No inline styles. Comments that explain *why*, not *what*.

## Design tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#050403` | page background (matches the black of the hero image) |
| `--ink` | `#F4EEE4` | main text |
| `--ink-2` | `#CFC6BA` | secondary text, nav links |
| `--ink-3` | `#9C9286` | captions, mono labels |
| `--gold` | `#D4A867` | accent |
| `--gold-soft` | `#E8C48A` | gradient end |
| `--gold-light` | `#F6DBAE` | links, glow |
| `--gold-white` | `#FFF4DC` | button text |

## The two states (see `reference/`)

`reference/Reveal-1-start.html` and `reference/Reveal-2-end.html` are the approved designs, written for a design tool (ignore the `<x-dc>`, `<helmet>` and `support.js` wrapper; read the markup and inline styles for exact sizes, colors, spacing). Rebuild them properly.

### State 1 — before scroll (the page as it loads)

- Full-viewport section, background `assets/hero-light-column.png`: `cover`, positioned `center bottom`. It is a single vertical column of golden light at the exact horizontal center, rising from smoke on the floor. This light is **the gap of a door that is slightly open**: the door itself is never drawn.
- Header (max-width 1240px): `logo-horizontal-dark.svg` left (40px high), nav center (Work, Services, Studio, Jost 15px, `--ink-2`), "Contact" right in `--gold-light`.
- Centered, 64px under the header:
  - `h1`: "Your door<br>to the internet." Unbounded 500, 72px, line-height 1.04, letter-spacing -0.03em, text filled with a vertical gradient `#FFFFFF → #F4EEE4 (55%) → #E8C48A` (background-clip: text).
  - `p`: "Websites and social media for businesses in Morocco." Jost 19px, `--ink-2`.
  - Glass button "Start your site": 54px high, radius 14px, background `linear-gradient(180deg, rgba(255,248,234,.10), rgba(255,248,234,.03))`, 1px border `rgba(246,219,174,.32)`, `backdrop-filter: blur(16px)`, inset top highlight and a soft gold glow `0 0 60px rgba(232,184,119,.25)`. It must look like it picks up the light behind it.
- **No trace of the work at the start.** The laptop is fully hidden.

### State 2 — after scroll

- Title, paragraph and button are gone.
- The light column has **opened wider**, like the door opening: a broad, blurred vertical glow (about 760px wide, gold, transparent at both edges) behind the laptop. Build it as its own element on top of the background image.
- A dark laptop, centered and straight, 1040px wide (max 100%):
  - lid: `linear-gradient(180deg, #24221F, #141210)`, radius 22px 22px 0 0, padding 14px 14px 20px, 1px border `rgba(246,219,174,.20)` (no bottom border), glow `0 -20px 120px rgba(232,184,119,.20)`; inside it `stomatolog-screenshot.png` with radius 6px.
  - base: 16px high, 60px wider than the lid on each side, radius 0 0 16px 16px, `linear-gradient(180deg, #3A3631, #24211E 60%, #121110)`, a small dark notch centered on top.
- Caption under it: "Stomatolog" (Unbounded 18px, `--ink`) · "Dental clinic" · "Concept" (IBM Plex Mono 12px, uppercase, letter-spacing .14em, `--ink-3`).

## The animation (state 1 → state 2)

- Pin the hero with ScrollTrigger and drive one GSAP timeline with `scrub` (smoothed, e.g. `scrub: 1`) over about **200vh** of scroll.
- Rough choreography (percent of the timeline):
  - 0–30%: title, paragraph and button move up (~ -60px) and fade out. Header stays.
  - 15–60%: the wide light glow grows from the thin column to full width (`scaleX` from ~0.12 to 1) and fades in.
  - 25–90%: the laptop rises **out of the light**: from below (~ 50vh down), tilted back (`rotateX` ~ 25deg → 0, with perspective), slightly smaller (scale ~0.85 → 1), opacity 0 → 1.
  - 85–100%: caption fades in.
- One easing family for the whole site (pick one, e.g. `power2.out` / `power3.out`) and keep it consistent.
- Animate **only `transform` and `opacity`**. Use `will-change` carefully. It must stay at 60fps on a MacBook.
- Lenis + ScrollTrigger must be wired correctly (`lenis.on('scroll', ScrollTrigger.update)`, run Lenis from `gsap.ticker`, `lagSmoothing(0)`).

## Mobile (≤ 860px)

- Hide the nav links, keep the logo and "Contact".
- Title around 40px.
- Lighter animation: shorter pin (~120vh) or no pin at all, just the laptop rising and fading in as it enters. The light column image already works on a narrow screen because it is centered.
- The laptop scales to the screen width (base overhang ~10px).

## Accessibility and quality

- Semantic HTML: `header`, `nav`, one `h1`, real `<a>` and `<button>` elements, meaningful `alt` on the screenshot ("Stomatolog website homepage").
- `prefers-reduced-motion: reduce` → no pin and no scrub: show state 1, then the laptop section as a normal static block under it.
- Visible focus styles, touch targets ≥ 44px, text contrast ≥ 4.5:1.
- Preload the hero background. Lazy-load the screenshot.

## Notes

- The Stomatolog screenshot shows a Russian phone number. Keep it for now; it will be replaced later.
- When done, tell me how to run it (`npm install`, `npm run dev`) and what to check in the browser and on my phone.
