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
- `winter.jpg` = the winter render of the same view supplied by the client; the printed logo was retouched out of the sky and the white "BOOK NOW / www" band cropped off. Architecture untouched.
- `logo-kitzalpen.png` = `/images/logo-kitz-2024.png` (already transparent)

Both photos show the same viewpoint. `placePhotos()` aligns them on the top-left corner of the upper balcony and on the balcony block height, so the building continues seamlessly across the divider. Scaling is capped, nothing is warped.

To swap photos: put the new original in `public/images/`, generate two width variants (listed in `sizes`) in `.webp` and `.avif` (any tool, quality ~80 / ~60), then set `w`, `h` and the landmarks in `PHOTOS`.

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
- Divider: drag with mouse or finger (only the line and the handle capture touch, so vertical scroll still works). On release it glides all the way to the side you pulled towards. Sommer/Winter buttons do the same (about 1.5 s). The handle docks at the frame edge so you can pull it back. ←/→ keys go to winter/summer.
- Atmosphere (`SeasonFx.tsx`): when winter is fully shown, snow starts falling at three depths; leaving winter fades it out. When summer is fully shown, a soft sun blooms in over the sky with warm light. Both are off with reduced motion.
- Desktop only: mouse parallax (photos ±10 px, text in the opposite direction), magnetic buttons.
- Scroll: the photo zooms slowly, the headline lifts and fades, the booking bar withdraws, and the header turns compact and dark green.
- `prefers-reduced-motion`: no intro, no parallax and no scroll effects; transitions are instant.
- Touch targets ≥ 44 × 44 px. Body has `overflow-x: hidden`, and nothing is wider than the viewport.

---

# Section 02 – Unsere Zimmer

```
src/content/rooms.ts                 texts DE/EN, the four room categories with their real figures, features
src/components/rooms/RoomsSection.tsx   section layout + scroll animations (GSAP ScrollTrigger)
src/components/rooms/RoomsGallery.tsx   gallery: one slide per category with caption (name, ideal for, rooms · m² · guests · beds), arrows, the other three rooms as thumbnails, swipe, keyboard, lightbox (native <dialog>), 1 / 4 counter
src/components/rooms/RoomFeatures.tsx   four line-icon features
public/images/rooms/                 originals + WebP/AVIF (800 px and original width)
```

Mount it directly after the hero: `<Hero … /><RoomsSection lang={lang} />` (see `App.tsx`). It uses the global header; it does not render its own.

## Content checks (kitzalpen.at, homepage + /rooms/)

| Feature | Status |
|---|---|
| Komfortable Zimmer: eigenes Bad, Flachbild-TV, Bergblick | listed on the site |
| Alpenstil & Wohlfühlambiente | visible in the photos |
| Kostenloses WLAN | listed on the site |
| Frühstück **inklusive** | site lists a *Frühstücksbuffet 08:00–10:00*, but not that it is included in the rate, so the feature carries a "zu bestätigen" marker. Remove `verify` in `rooms.ts` once confirmed. |

Room categories and numbers come from kitzalpen.at/rooms/ (Nov 2026):

| Category | Rooms | m² | Guests | Beds | Photo |
|---|---|---|---|---|---|
| Doppelzimmer | 8 | 15–21 | 2 | Doppelbett | room-1 = site `double-01` |
| Dreibettzimmer | 3 | 17–24 | 3 | Doppelbett + Einzelbett | room-2 = site `triple-01` |
| Familienzimmer mit Verbindungstür | 4 | 19–31 | 4 (two connected: 8) | flexibel | room-3 = site `family-01` |
| Vierbettzimmer | 2 | 19–31 | 4 | flexibel | room-4 = site `quad-01` |

Each supplied photo was matched pixel-for-pixel to the first gallery image of that category on the live site, so the labels are confirmed. Every room includes TV, WLAN, a private bathroom and a shower.

## Motion

- Hand-over from the hero: the cream sheet rises from the dark hero with rounded top corners and opens to full width while scrolling (scrubbed, no scroll lock, no white gap).
- Reveal plays once at `top 62%`: eyebrow, headline lines (mask), sub-text, photo from a rectangular mask with a 1.1→1 zoom-out, features (100 ms stagger), thumbnails (y 20 → 0), button.
- Photo change: the current photo slides 48 px away and fades out; the next one fades in with scale 1.04 → 1. Duration 750 ms, `cubic-bezier(0.22, 1, 0.36, 1)` via GSAP CustomEase.
- Desktop hover: zoom 1.025, a very light overlay, and a "VIEW / Ansehen" cursor (the gallery stays fully keyboard operable: Tab focuses it, ←/→ change the photo, Enter opens the lightbox).
- Mobile: the photo follows the finger while swiping (vertical scroll stays free), thumbnails sit in a horizontal strip, and there is no mouse parallax.
- `prefers-reduced-motion`: no reveals; photo changes are instant.
