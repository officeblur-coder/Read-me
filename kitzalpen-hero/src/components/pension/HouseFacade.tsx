import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Season } from '../../content/hero';
import { SeasonFx } from '../SeasonFx';
import { HOUSE_ROOMS, type AllRoomsCopy, type HouseRoom, type RoomType } from '../../content/allRooms';

interface Props {
  t: AllRoomsCopy;
  season: Season;
  reduced: boolean;
  tone: Record<RoomType, string>;
  floor: number | 'all';
  matches: (r: HouseRoom) => boolean;
  hover: HouseRoom | null;
  onHover: (r: HouseRoom | null) => void;
  onOpen: (r: HouseRoom) => void;
  onFloor: (f: number) => void;
}

const UPPER = [3, 2, 1] as const;

/** One room = one lit window with shutters and a sill in the room type's colour. */
function Win({ r, lit, tone, active, t, onHover, onOpen }: { r: HouseRoom; lit: boolean; tone: string; active: boolean; t: AllRoomsCopy; onHover: Props['onHover']; onOpen: Props['onOpen'] }) {
  return (
    <button type="button" onClick={() => onOpen(r)} aria-label={`${t.open(r.no)} · ${t.types[r.type]} · ${r.m2} m²`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(r)} onPointerLeave={() => onHover(null)} onFocus={() => onHover(r)} onBlur={() => onHover(null)}
      className={`hf-win js-hf-win group ${lit ? 'is-lit' : ''} ${active ? 'is-active' : ''}`} style={{ ['--tone' as string]: tone }}>
      <span aria-hidden className="hf-shutter hf-shutter-l" />
      <span aria-hidden className="hf-pane">
        <span className="hf-glow js-hf-glow" />
        <span className="hf-cross" />
        <span className="hf-no lnum">{r.no}</span>
      </span>
      <span aria-hidden className="hf-shutter hf-shutter-r" />
      <span aria-hidden className="hf-sill" />
    </button>
  );
}

/**
 * The guesthouse as a small evening diorama: mountains, a deep alpine roof, timber balconies
 * with heart cut-outs, and one window per room. Winter: snow on roof, rails and ground.
 * Summer: geraniums on the balconies and a green meadow. Windows light up for the current filter.
 */
export function HouseFacade({ t, season, reduced, tone, floor, matches, hover, onHover, onOpen, onFloor }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const winter = season === 'winter';

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-hf-sky'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 0)
      .fromTo(q('.js-hf-mtn'), { yPercent: 30, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.4, stagger: 0.12 }, 0.1)
      .fromTo(q('.js-hf-ground'), { yPercent: 100 }, { yPercent: 0, duration: 0.9 }, 0.3)
      .fromTo(q('.js-hf-level'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, stagger: 0.16, ease: 'expo.out', clearProps: 'clipPath' }, 0.5)
      .fromTo(q('.js-hf-roof'), { yPercent: -40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: 'back.out(1.4)' }, 1.15)
      .fromTo(q('.js-hf-rail'), { scaleX: 0 }, { scaleX: 1, duration: 0.8, stagger: 0.1, ease: 'expo.out' }, 1.25)
      .fromTo(q('.js-hf-snow'), { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05 }, 1.7)
      // the house wakes up: windows switch on one by one
      .fromTo(q('.js-hf-glow'), { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out', stagger: { each: 0.07, from: 'random' }, clearProps: 'opacity' }, 1.8)
      .fromTo(q('.js-hf-chimney'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, 2.4);
  }, { scope: root, dependencies: [reduced] });

  const lit = (r: HouseRoom) => matches(r) || hover?.no === r.no;
  const floorPill = (f: number) => (
    <button type="button" onClick={() => onFloor(f)} aria-pressed={floor === f} aria-label={t.floors[f]}
      className={`hf-floor lnum ${floor === f ? 'is-on' : ''}`}>{t.floorShort[f]}</button>
  );

  return (
    <div ref={root} className={`hf ${winter ? 'is-winter' : 'is-summer'}`}>
      {/* sky + mountains */}
      <div aria-hidden className="js-hf-sky hf-sky absolute inset-0">
        <span className="hf-stars" />
        <span className="hf-moon" />
      </div>
      <svg aria-hidden viewBox="0 0 640 260" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-x-0 bottom-[18%] h-[62%] w-full">
        <path className="js-hf-mtn" fill="var(--hf-m3)" d="M0 200 70 120 120 160 190 70 250 140 300 100 360 150 430 60 500 130 560 90 640 150V260H0Z" />
        {winter && <path className="js-hf-mtn" fill="rgba(255,255,255,.55)" d="M190 70 172 92 186 88 196 98 206 86 214 92ZM430 60 410 86 424 82 434 94 446 80 456 88ZM560 90 545 108 558 104 566 112 574 104Z" />}
        <path className="js-hf-mtn" fill="var(--hf-m2)" d="M0 220 60 170 120 200 200 140 270 190 330 160 400 200 470 150 540 190 600 165 640 185V260H0Z" />
        <g className="js-hf-mtn" fill="var(--hf-m1)">
          {[30, 70, 560, 600, 615].map((x, i) => <path key={x} d={`M${x} ${236 - (i % 2) * 10}l14 -38 14 38Z`} />)}
        </g>
      </svg>
      <div aria-hidden className="js-hf-ground hf-ground absolute inset-x-0 bottom-0 h-[20%]" />
      {winter && <SeasonFx mode="winter" mobile reduced={reduced} />}

      {/* the house */}
      <div className="relative mx-auto w-[86%] pt-[6%]">
        <span aria-hidden className="js-hf-chimney hf-smoke" />
        <svg aria-hidden viewBox="0 0 620 170" className="js-hf-roof relative z-[2] -mb-[2px] block w-[110%] -translate-x-[4.55%] overflow-visible">
          <rect x="410" y="34" width="34" height="62" fill="var(--hf-stone)" />
          <rect x="404" y="28" width="46" height="10" fill="var(--hf-wood-d)" />
          {/* gable boards */}
          <path d="M44 160 310 52 576 160Z" fill="var(--hf-wood)" />
          <path d="M44 160 310 52 576 160Z" fill="url(#hf-boards)" opacity=".5" />
          <defs>
            <pattern id="hf-boards" width="14" height="10" patternUnits="userSpaceOnUse"><rect width="1.4" height="10" fill="#000" opacity=".35" /></pattern>
          </defs>
          {/* attic balcony + window */}
          <rect x="276" y="104" width="68" height="46" rx="4" fill="var(--hf-pane-d)" stroke="var(--hf-wood-d)" strokeWidth="5" />
          <rect x="280" y="108" width="60" height="38" fill="var(--hf-warm)" className="js-hf-glow hf-attic" />
          <path d="M310 106v42M278 127h64" stroke="var(--hf-wood-d)" strokeWidth="3" />
          <rect x="226" y="146" width="168" height="14" fill="var(--hf-wood-d)" />
          {/* roof slopes + fascia */}
          <path d="M-4 168 310 32 624 168 624 182 310 48 -4 182Z" fill="var(--hf-roof)" />
          <path d="M-4 182 310 48 624 182" fill="none" stroke="var(--hf-wood-d)" strokeWidth="7" />
          <path d="M-4 170 310 34 624 170" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
          {winter && (
            <path className="js-hf-snow" fill="#f4f7fb" d="M-10 172 310 24 630 172 628 180C600 170 590 182 570 172 540 158 520 170 500 158 470 144 450 152 430 140 400 124 380 130 350 112 330 100 320 92 310 86 300 94 286 102 266 112 240 126 220 124 190 140 170 150 150 146 120 160 100 170 80 164 50 176 30 168 10 182Z" />
          )}
        </svg>

        <div className="hf-wall relative z-[1]">
          {UPPER.map((f) => {
            const rooms = HOUSE_ROOMS.filter((r) => r.floor === f);
            return (
              <div key={f} className="js-hf-level hf-level">
                {floorPill(f)}
                <div className="hf-row" style={{ gridTemplateColumns: `repeat(6, minmax(0, 1fr))` }}>
                  {rooms.map((r) => <Win key={r.no} r={r} lit={lit(r)} active={hover?.no === r.no} tone={tone[r.type]} t={t} onHover={onHover} onOpen={onOpen} />)}
                </div>
                <div className="js-hf-rail hf-rail">
                  {winter ? <span className="js-hf-snow hf-rail-snow" /> : <span className="js-hf-snow hf-flowers" />}
                </div>
              </div>
            );
          })}
          {/* ground floor: stone base, entrance and room 001 */}
          <div className="js-hf-level hf-level hf-base">
            {floorPill(0)}
            <div className="hf-row" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
              <span aria-hidden className="hf-shop col-span-2"><span className="js-hf-glow hf-glow" /></span>
              <span aria-hidden className="hf-door col-span-2"><span className="js-hf-glow hf-glow" /></span>
              {HOUSE_ROOMS.filter((r) => r.floor === 0).map((r) => <Win key={r.no} r={r} lit={lit(r)} active={hover?.no === r.no} tone={tone[r.type]} t={t} onHover={onHover} onOpen={onOpen} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
