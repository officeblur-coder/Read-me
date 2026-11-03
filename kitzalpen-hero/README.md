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

---

# Section 03 – Unsere Leistungen

```
src/content/amenities.ts                     8 amenities (exactly those listed on kitzalpen.at), texts DE/EN, quick-action URLs
src/components/amenities/AmenitiesSection.tsx  layout, scroll reveal, panorama parallax, mountain hand-over
src/components/amenities/AmenityCard.tsx       card with real photo, line icon (drawn in), per-card micro-animation
src/components/amenities/AlpineTransition.tsx  ridge silhouette + gold crest line at the bottom edge
src/components/QuickActions.tsx               GLOBAL WhatsApp / Chalet buchen / Zimmer buchen (mount once in App)
public/images/amenities/                       bathroom, restaurant, breakfast, panorama (supplied); wifi, tv (crops of room photos);
                                               parking, mountain (crops of the summer exterior). M+ card: drawn, no photo.
```

Mount after the rooms: `<RoomsSection/><AmenitiesSection lang={lang}/>`, and `<QuickActions lang reduced/>` once, outside `<main>`.

## Facts used
- Amenities: Kostenloses WLAN, Flachbild-TV, Kostenloser Parkplatz, Restaurant & Bar, Frühstücksbuffet, Eigenes Badezimmer, Bergblick, M+ Gästekarte (all from the homepage list).
- Details shown only where published: Frühstück 08:00–10:00, Abendessen Di–So 17–21 Uhr, bathroom with shower (room pages).
- Copy: the brief said "Tiroler Gastfreundschaft". Hollersbach is in the Salzburger Land (Pinzgau), so the text says "Pinzgauer Gastfreundschaft". Change it in `amenities.ts` if wanted.

## Quick actions (same URLs as the live site)
- WhatsApp → `https://wa.me/40748192821?text=…`
- Chalet buchen → `https://chalet-kitzalpen.pynbooking.direct/`
- Zimmer buchen → `https://kitzbuhel.pynbooking.direct`

Mobile: sticky bottom bar (safe-area aware). It appears after the hero, since the hero has its own booking bar, and gets compact while scrolling down. A 96 px spacer at the end of `<main>` keeps the last content uncovered. Desktop: slim dock on the left edge; labels slide out on hover or focus. If the live site already renders its own bar, keep only one of the two.

Note: the hero's "Verfügbarkeit prüfen" can now be wired to `kitzbuhel.pynbooking.direct` (the real booking engine) during integration.

## Motion
- The dark sheet rises over the cream rooms section (clip-path, scrubbed), and the panorama drifts slower than the page.
- Reveal (≈1.7 s, once): eyebrow → headline lines (mask) → sub → relief contour lines drawn → cards in diagonal waves (100 ms). Each card enters with clip and y, then its gold border fades in, a sheen line runs along the top edge, and the icon strokes draw themselves.
- Hover (desktop): lift 4 px, photo zoom 1.04, lighter veil, stronger gold border, plus a one-shot icon animation: Wi-Fi waves, TV light sweep, bold P, cloche lifts 2 px, steam draws, two drops fall, ridge redraws, card tilts. Touch: the same animation plays once on tap, and scrolling is never blocked. Keyboard focus triggers it too.
- Bottom: the cream ridge rises and the gold crest line traces itself into the next section.
- `prefers-reduced-motion`: everything is static.

---

# Section 04 – KitzAlpen Chalet

```
src/content/chalet.ts                           texts DE/EN, three photos, five features (all from kitzalpen.at/chalet/)
src/components/chalet/ChaletSection.tsx           layout, reveal timeline, contour hand-over at the bottom
src/components/chalet/ChaletGallery.tsx           gallery: side arrows, dots, 01 / 03, thumbnails, swipe, keyboard, lightbox
src/components/chalet/SeasonalImageTransition.tsx scroll-scrubbed summer → winter on the first slide (reversible)
src/components/chalet/ChaletFeatures.tsx          five line icons; they redraw on hover / tap
public/images/chalet/                             winter, summer (supplied), bunk (= interior-03 from the live chalet gallery)
```

Mount after the amenities section: `<AmenitiesSection/><ChaletSection lang={lang}/>`.

Facts: "bis zu 4 Gäste" is stated on kitzalpen.at/chalet/ (and the homepage). Features match the site's list: kitchen, bathroom with WC, living area, double bed & bunk bed ("Doppelbett und Etagenbett"). "Mehr Details" links to /chalet/. Booking stays with the global quick actions (chalet-kitzalpen.pynbooking.direct).

Summer → winter: the photos come from different viewpoints, so nothing is overlaid or warped. Winter descends over summer through a feathered mask while summer slowly pushes in (1 → 1.07) and winter settles (1.08 → 1). It is scrubbed from `top 78%` to `bottom 30%` of the photo, fully reversible, and a label switches Sommer → Winter. With reduced motion, the winter photo is shown statically.

Gallery change: a cinematic wipe from the side you travel to, 800 ms, `cubic-bezier(0.22,1,0.36,1)`, with the new photo settling from 1.06 and the old one drifting 4 %.

---

# Section 05 – Restaurant & Bar

```
src/content/restaurant.ts                              texts DE/EN, 4 photos, highlights, hours, menu PDF URL
src/components/restaurant/RestaurantSection.tsx         layout + two reveal timelines (top block, then highlights + hours)
src/components/restaurant/RestaurantGallery.tsx         crossfade gallery (700 ms, scale 1.05→1), arrows, dots, thumbnails, swipe, keyboard, lightbox
src/components/restaurant/RestaurantHighlights.tsx      4 line icons (drawn in on reveal, redrawn on hover/tap)
src/components/restaurant/RestaurantOpeningHours.tsx    hours bar + live "open now" (Europe/Vienna time)
public/images/restaurant/                               hall, bar, corner, lounge (supplied photos)
```

Mount after the chalet: `<ChaletSection/><RestaurantSection lang={lang}/>`.

Facts from kitzalpen.at/restaurant/: Frühstück 08:00–10:00, Abendessen 17:00–21:00, Dienstag–Sonntag, Montags geschlossen. "Speisekarte entdecken" opens the real menu, `https://www.kitzalpen.at/menu/kitzalpen-menu.pdf`, in a new tab. As in section 03, "Tiroler" was changed to "Pinzgauer Gastfreundschaft" (Hollersbach is in the Salzburger Land).

Quick actions: the left dock is now desktop-only (≥1024 px). Tablets use the bottom bar, so the dock never covers content at 768 px.

---

# Global season + Section 06 – Activities

## Shared season (Hero → whole site)
- `src/lib/season.tsx`: `SeasonProvider` / `useSeason()` holds one `season`. It is stored in `localStorage` (`kitzalpen-season`) and mirrored to `<html data-season>`. `index.html` sets the attribute before first paint, so there is no flash of the wrong palette.
- The Hero's Sommer / Winter selector and the divider settling at either end call `setSeason`. Nothing else has its own selector. A returning visitor's hero glides to the stored season after the intro.
- Palette: every brand colour is now a CSS variable (`--k-pine`, `--k-deep`, `--k-cream`, `--k-soft`, `--k-gold(-light|-dark)`, `--k-goldink`, `--k-ink`, `--k-forest`), registered with `@property` so the whole site cross-fades in about 1.1 s. Tailwind colours (`pine`, `cream`, `gold`, …) point at them, and hard-coded hex values in existing components were replaced 1:1. Summer keeps the approved forest / ivory / champagne values. Winter uses midnight blue `#102B46`, glacier white `#F5F9FC`, ice blue and steel blue `#759CB7`. Photos are never tinted.

## Activities
```
src/content/activities.ts                     summer activities + winter ski areas, DE/EN, links, page copy
src/components/activities/ActivitiesSection.tsx  section (id="activities"): entrance, season swap, parallax, mobile strip
src/components/activities/ActivityCard.tsx       card: image-mask reveal, hover (zoom, arrow, underline)
src/components/activities/ActivitiesPage.tsx     dedicated page per season
public/images/activities/                         photos from kitzalpen.at/activities + the two supplied feature photos
```
Routes: here `#activities-summer` / `#activities-winter` (hash routing, as the preview cannot use paths). On the live site, map them to `/activities/summer` and `/activities/winter` and render `<ActivitiesPage season=… />`. Opening a page also sets the global season.

Facts come only from kitzalpen.at (/activities/, /ski/): Smaragdweg 7 km, Tauernradweg 310 km, Wildkogel 800 km MTB, KitzSki via Panoramabahn 2 km, Kitzsteinhorn glacier to 3,029 m, Schmittenhöhe 30+ three-thousanders, and the official links.
Not verified, so marked or omitted:
- Zillertal Arena: card shown with "Angaben werden geprüft", no photo, no distance.
- SkiWelt Wilder Kaiser – Brixental: mentioned on the winter page as "to be added after verification".
- Distances and drive times for the other resorts are not published on the site, so none are shown.

Motion:
- Entrance (once, at `top 80%`): eyebrow, headline lines (mask), subtitle, then the feature photo is revealed from the bottom, the cards appear with a 0.1 s stagger and image-mask reveals, and the CTA comes last.
- Season change: if the section is visible, it plays out (headline lifts out, feature mask closes, cards fade), swaps the data, then plays in. If it is offscreen, it updates silently without scrolling. Rapid toggling kills the running timeline, so no mixed content.
- Ambient: faint topographic lines drift slowly; restrained parallax on the feature photo (fine pointer only).
- `prefers-reduced-motion`: static.

---

# Update: season calendar, chalet, weather band, booking, concierge capsule

**Default season by date.** When the site opens, the season follows the calendar in Hollersbach (Europe/Vienna): **1 Nov – 15 Apr = winter**, otherwise summer (`seasonByDate()` in `src/lib/season.tsx`, same rule inline in `index.html` before first paint). A visitor's own choice is kept for the browser tab (`sessionStorage`), and a new visit starts from the calendar again. After the 50/50 intro, the hero divider glides to that season.

**Chalet follows the season.** The main photo shows summer or winter to match the selection. On a switch, winter descends over summer through the feathered mask, or lifts again. Thumbnails show the other season and the bunk-bed room.

**Weather band** (`src/components/WeatherBand.tsx`, `src/content/weather.ts`). A thin band fixed above the header that stays while scrolling and runs as a slow ticker (pauses on hover).
- Winter: Hollersbach, KitzSki, Wildkogel and Kaprun/Kitzsteinhorn with sky, temperature, today's min/max, plus snow depth and fresh snow for the ski areas.
- Summer: weather only.
- Data: [Open-Meteo](https://open-meteo.com), free, no key, CORS enabled, CC BY 4.0 (attribution shown). It loads live and refreshes every 15 min.
- Snow depth is a **model value** for the given point and altitude, not the resort's official snow report (the band says so). If official numbers are wanted, they need a licensed feed (e.g. the resorts' or a snow-report provider's API).
- `scripts/weather-snapshot.mjs` writes `public/weather.json`, a fallback used only where the live call is blocked (sandboxed previews).

**Booking → pynbooking.** All booking actions lead to the real engine `https://kitzbuhel.pynbooking.direct/`.
- Hero bar: the button is a real link built by `bookingUrl()`, e.g. `/search?checkin=2026-12-20&checkout=2026-12-27&room1=A,A,8`. `A` = adult (18+), a number = child's age (0–17), checked against the engine. The guest panel therefore asks each child's age. Without dates it opens the engine's availability calendar.
- Header "Jetzt buchen" and the mobile menu button link straight to the engine.
- The engine's own calendar/prices are not embedded: it has no public embeddable widget or CORS API, so the site hands over with the search already filled in.

**Concierge capsule** (replaces the dock and bottom bar). It is one capsule, `[WhatsApp] [Buchen ▴]`: bottom-right on desktop, bottom-centre on mobile, safe-area aware. It appears after the hero and slims while scrolling down. "Buchen" opens a small panel or sheet with two photo cards, Zimmer (Pension) and Chalet (photo follows the season), linking to their pynbooking engines, plus the WhatsApp line. Escape or an outside click closes it.

---

# Section 07 – The Alpine Experience

`src/components/experience/AlpineExperienceSection.tsx`, photos in `public/images/experience/` (the two originals supplied by KitzAlpen: summer lake with alpine roses, winter glacier panorama).

Mounted right after `<ActivitiesSection/>`. It reads the shared season from `useSeason()` (same source as Hero, Chalet, Activities) and has no selector of its own.

- Fullscreen (`min-height: 100svh` desktop, `92svh` mobile). The photo is `object-fit: cover` with a focal point per season and breakpoint (`--pos-d` / `--pos-m`). A season-tinted gradient sits behind the text, text is left-aligned (max 650 px), and the CTA goes to `#activities-summer|winter` (live: `/activities/summer|winter`).
- Both photos are loaded up front, so a season switch never waits for the network.
- Reveal (once): photo 1.08 → 1, eyebrow, headline lines (mask), subtitle (y 20), CTA last, power3.out.
- Season switch: text lifts out, photos crossfade (about 1 s, new one settles 1.06 → 1), new text reveals. Scroll position is untouched. Rapid toggling kills the running timeline. If the visitor switches back mid-swap, the section restores the current season (the same fix was applied to Activities).
- Desktop parallax ±4 %. `prefers-reduced-motion`: static.
- Note: the supplied winter photo is 1024 px wide, so on large desktop screens it is upscaled. A larger original (≥ 2000 px) would look sharper.
