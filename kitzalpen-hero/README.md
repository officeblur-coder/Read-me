# KitzAlpen – Header + Hero

Separate implementation of the new header and hero for kitzalpen.at. It does not touch the live site.

Stack: React 18 + TypeScript, Tailwind CSS 3, GSAP 3 + ScrollTrigger (`@gsap/react`), Vite.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/ (relative paths, works in any sub-folder)
```

## Structure

```
src/
  content/hero.ts          texts DE/EN, real navigation URLs, photo landmarks
  lib/align.ts             lines the two photos up on the building (no distortion)
  lib/hooks.ts             reduced motion, pointer type, magnetic buttons, element size
  components/
    Header.tsx             transparent → compact header, DE/EN, "Jetzt buchen"
    MobileMenu.tsx         full-screen forest panel, staggered links, reverses on close
    Logo.tsx               original logo PNG used as a CSS mask (recolourable, shapes untouched)
    Hero.tsx               intro timeline, scroll cinematic, mouse parallax
    SeasonCompare.tsx      summer/winter photos, curved divider, drag/touch/keyboard
    SeasonToggle.tsx       Sommer / Winter selector
    BookingBar.tsx         dates + guests, validation, emits a BookingRequest
public/images/             originals (jpg) + WebP/AVIF at 960 and 1600 px, transparent logo
```

## Photos

- `summer.jpg` = `/images/exterior/exterior10.jpeg` from kitzalpen.at
- `winter.jpg` = `/images/pension/pension-winter-day.jpg` from kitzalpen.at
- `logo-kitzalpen.png` = `/images/logo-kitz-2024.png` (already transparent)

The two photos were taken from different positions. `placePhotos()` aligns them on the centre of the balcony façade and on the building height, but caps the extra scaling of the winter photo (1.08× desktop, 1.0× mobile) so it never gets blurry. Nothing is warped. If you later get a winter photo taken from the same spot as the summer one, replace `winter.jpg`, update `lx / ly / bh` in `src/content/hero.ts`, and the overlay becomes exact.

To swap photos: put the new original in `public/images/`, generate `-960` and `-1600` variants in `.webp` and `.avif` (any tool, quality ~80 / ~60), then set `w`, `h` and the landmarks in `PHOTOS`.

## Booking bar → real booking system

`BookingBar` never sends anything by itself. On a valid submit it calls `onSubmit(req)` with:

```ts
{ checkIn: '2026-12-20', checkOut: '2026-12-27', nights: 7, adults: 2, children: 1 }
```

In `App.tsx` this is currently forwarded as a DOM event:

```js
window.addEventListener('kitzalpen:booking-request', (e) => { /* e.detail */ });
```

Connect it to the existing "Schnellbuchung" enquiry form or to the booking engine once its API/URL is known. No booking URL was invented.

## Integration options

1. **Whole page in React** – mount `<App />` (or `<Header />` + `<Hero />`) in the site's layout.
2. **Static embed** – `npm run build`, copy `dist/` into a folder of the site (e.g. `/neu/`), and test it there before switching the homepage.
3. **Existing CMS template** – build, then include `dist/assets/*.js` and `*.css` and a `<div id="root">` in the homepage template.

Fonts: Cormorant Garamond and Manrope from Google Fonts (both SIL Open Font License). Self-host them for GDPR, if the site's policy needs it (e.g. via `@fontsource/cormorant-garamond` and `@fontsource/manrope`).

## Behaviour notes

- Intro (about 2.5 s): charcoal fade → photos zoom out 1.06→1 → header items → headline mask reveal → divider + toggle → booking bar.
- Divider: drag with mouse or finger (only the line and the handle capture touch, so vertical scroll still works), Sommer/Winter buttons animate it over 1.4 s, ←/→ keys move it (Shift for larger steps), Home/End go to the ends.
- Desktop only: mouse parallax (photos ±10 px, text in the opposite direction), magnetic buttons.
- Scroll: the photo zooms slowly, the headline lifts and fades, the booking bar withdraws, and the header turns compact and dark green.
- `prefers-reduced-motion`: no intro, no parallax and no scroll effects; transitions are instant.
- Touch targets ≥ 44 × 44 px. Body has `overflow-x: hidden`, and nothing is wider than the viewport.
