import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { HOUSE_ROOMS, type AllRoomsCopy, type HouseRoom, type RoomType } from '../../content/allRooms';

const IMG = `${import.meta.env.BASE_URL}images/sketch/`;

/**
 * Pencil sketch generated from the client's photo of the house (crop x 600–1600, y 270–800 of 1672×941).
 * Windows are traced from that photo per floor. Which window belongs to which room is not known,
 * so rooms are attached to their floor (from the brochure), never to a single window.
 */
const X0 = 600, Y0 = 270, CW = 1000, CH = 530;
type R4 = [number, number, number, number];
const WINDOWS: Record<number, R4[]> = {
  3: [[985, 422, 1025, 462], [1120, 421, 1185, 450], [1254, 424, 1289, 452], [1320, 427, 1356, 460]],
  2: [[956, 511, 1011, 552], [1122, 511, 1185, 550], [1251, 512, 1287, 550], [1347, 512, 1406, 550], [772, 505, 792, 544], [804, 506, 824, 544], [839, 509, 854, 545]],
  1: [[956, 607, 1011, 650], [1041, 606, 1062, 637], [1125, 607, 1202, 645], [1251, 607, 1287, 645], [1347, 607, 1406, 645], [771, 595, 791, 632], [802, 600, 825, 636], [837, 605, 855, 637]],
  0: [[892, 700, 1010, 750], [1107, 700, 1140, 752], [1182, 697, 1290, 742], [1329, 697, 1354, 736], [775, 680, 847, 740]],
};
/** floor zones on the façade (y from–to) and where the floor tag points */
const BANDS: Record<number, [number, number]> = { 3: [405, 478], 2: [494, 572], 1: [588, 666], 0: [678, 762] };
const pos = ([x1, y1, x2, y2]: R4) => ({ left: `${((x1 - X0) / CW) * 100}%`, top: `${((y1 - Y0) / CH) * 100}%`, width: `${((x2 - x1) / CW) * 100}%`, height: `${((y2 - y1) / CH) * 100}%` });

interface Props {
  t: AllRoomsCopy;
  reduced: boolean;
  tone: Record<RoomType, string>;
  floor: number | 'all';
  matches: (r: HouseRoom) => boolean;
  hover: HouseRoom | null;
  onHover: (r: HouseRoom | null) => void;
  onOpen: (r: HouseRoom) => void;
  onFloor: (f: number) => void;
}

export function HouseSketch({ t, reduced, tone, floor, matches, hover, onHover, onOpen, onFloor }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const hf = hover ? hover.floor : floor === 'all' ? null : floor;
  const floorLit = (f: number) => HOUSE_ROOMS.some((r) => r.floor === f && matches(r));

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-sk-card'), { autoAlpha: 0, y: 40, rotate: -3 }, { autoAlpha: 1, y: 0, rotate: -0.8, duration: 1.1 }, 0)
      // the pencil draws the house from left to right
      .fromTo(q('.js-sk-draw'), { '--rev': '-25%' }, { '--rev': '125%', duration: 2.2, ease: 'power1.inOut' }, 0.35)
      .fromTo(q('.js-sk-pencil'), { left: '-6%', autoAlpha: 1 }, { left: '104%', duration: 2.2, ease: 'power1.inOut' }, 0.35)
      .to(q('.js-sk-pencil'), { autoAlpha: 0, duration: 0.3 }, 2.45)
      // watercolour wash bleeds in, then the windows light up
      .fromTo(q('.js-sk-wash'), { opacity: 0 }, { opacity: 0.32, duration: 1.4, ease: 'power2.out' }, 1.9)
      .fromTo(q('.js-sk-win'), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: { each: 0.05, from: 'random' }, clearProps: 'opacity' }, 2.5)
      .fromTo(q('.js-sk-tag'), { autoAlpha: 0, x: 10 }, { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.08 }, 2.6)
      .fromTo(q('.js-sk-note'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 2.8)
      .fromTo(q('.js-sk-row'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 2.7);
  }, { scope: root, dependencies: [reduced] });

  return (
    <div ref={root}>
      <figure className="js-sk-card sk-card">
        <div className="sk-stage" style={{ aspectRatio: `${CW} / ${CH}` }}>
          <img className="js-sk-wash sk-wash" src={`${IMG}house-wash-1600.webp`} srcSet={`${IMG}house-wash-800.webp 800w, ${IMG}house-wash-1600.webp 1600w`} sizes="(min-width:1024px) 560px, 92vw" alt="" aria-hidden />
          <div className="js-sk-draw sk-draw">
            <img src={`${IMG}house-sketch-1600.webp`} srcSet={`${IMG}house-sketch-800.webp 800w, ${IMG}house-sketch-1600.webp 1600w`} sizes="(min-width:1024px) 560px, 92vw"
              alt={t.house} className="h-full w-full" />
          </div>
          {[3, 2, 1, 0].map((f) => (
            <div key={f} aria-hidden className={`sk-band ${hf === f ? 'is-on' : ''}`} style={{ top: `${((BANDS[f][0] - Y0) / CH) * 100}%`, height: `${((BANDS[f][1] - BANDS[f][0]) / CH) * 100}%` }} />
          ))}
          {[3, 2, 1, 0].flatMap((f) => WINDOWS[f].map((w, i) => (
            <span key={`${f}-${i}`} aria-hidden className={`js-sk-win sk-win ${floorLit(f) ? 'is-lit' : ''} ${hf === f ? 'is-hot' : ''}`} style={pos(w)} />
          )))}
          {[3, 2, 1, 0].map((f) => (
            <button key={f} type="button" onClick={() => onFloor(f)} aria-pressed={floor === f} aria-label={t.floors[f]}
              className={`js-sk-tag sk-tag lnum ${floor === f || hf === f ? 'is-on' : ''}`} style={{ top: `${(((BANDS[f][0] + BANDS[f][1]) / 2 - Y0) / CH) * 100}%` }}>
              {t.floorShort[f]}
            </button>
          ))}
          <span aria-hidden className="js-sk-pencil sk-pencil" />
        </div>
        <figcaption className="js-sk-note sk-note">Reitlehen 42 · Hollersbach im Pinzgau</figcaption>
      </figure>

      {/* rooms per floor */}
      <div className="mt-5 flex flex-col gap-2">
        {[3, 2, 1, 0].map((f) => {
          const rooms = HOUSE_ROOMS.filter((r) => r.floor === f);
          return (
            <div key={f} className={`js-sk-row sk-row ${hf === f ? 'is-on' : ''}`}>
              <button type="button" onClick={() => onFloor(f)} aria-pressed={floor === f}
                className={`sk-rowlabel ${floor === f ? 'is-on' : ''}`}>{t.floors[f]}</button>
              <ul className="flex flex-1 flex-wrap gap-1.5 max-sm:w-full">
                {rooms.map((r) => (
                  <li key={r.no}>
                    <button type="button" onClick={() => onOpen(r)} aria-label={`${t.open(r.no)} · ${t.types[r.type]} · ${r.m2} m²`}
                      onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(r)} onPointerLeave={() => onHover(null)} onFocus={() => onHover(r)} onBlur={() => onHover(null)}
                      className={`ar-tile lnum relative grid h-9 w-[46px] place-items-center rounded-[9px] text-[12.5px] font-semibold sm:h-10 sm:w-[58px] sm:text-[13px] ${matches(r) ? '' : 'is-dim'}`}
                      style={{ ['--tone' as string]: tone[r.type] }}>{r.no}</button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
