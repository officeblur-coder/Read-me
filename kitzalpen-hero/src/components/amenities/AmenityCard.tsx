import { useRef } from 'react';
import type { Lang } from '../../content/hero';
import type { Amenity, AmenityKind } from '../../content/amenities';

const BASE = `${import.meta.env.BASE_URL}images/amenities/`;

/**
 * Line icons, 24px grid, 1.4 stroke. Every path carries pathLength="1" so the
 * reveal can draw them; parts with a class get the card's own micro-animation.
 */
function Icon({ kind }: { kind: AmenityKind }) {
  const p = { pathLength: 1, className: 'ic-draw' } as const;
  const body: Record<AmenityKind, JSX.Element> = {
    wifi: (
      <>
        <path {...p} className="ic-draw wave w3" d="M2.8 9.2a13.2 13.2 0 0 1 18.4 0" />
        <path {...p} className="ic-draw wave w2" d="M5.9 12.5a8.8 8.8 0 0 1 12.2 0" />
        <path {...p} d="M9 15.7a4.3 4.3 0 0 1 6 0" />
        <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    tv: (
      <>
        <defs><clipPath id="tv-screen"><rect x="3.7" y="5.2" width="16.6" height="10.6" rx="1" /></clipPath></defs>
        <rect {...p} x="3" y="4.5" width="18" height="12" rx="1.6" />
        <path {...p} d="M9 20h6M12 16.5V20" />
        <g clipPath="url(#tv-screen)"><rect className="tv-beam" x="-4" y="4" width="2.2" height="14" fill="currentColor" opacity="0" /></g>
      </>
    ),
    parking: (
      <>
        <rect {...p} x="4" y="3.5" width="16" height="17" rx="3.2" />
        <path {...p} className="ic-draw p-letter" d="M9.6 16.5V7.5h3.3a2.6 2.6 0 0 1 0 5.2H9.6" />
      </>
    ),
    restaurant: (
      <g className="cloche">
        <path {...p} d="M5.2 16.5a6.8 6.8 0 0 1 13.6 0" />
        <path {...p} d="M3.5 16.8h17M12 9.7V8.3M10.6 8.2h2.8" />
        <path {...p} d="M5 19.8h14" />
      </g>
    ),
    breakfast: (
      <>
        <path {...p} d="M5 11h11v3.4a4.6 4.6 0 0 1-4.6 4.6H9.6A4.6 4.6 0 0 1 5 14.4V11Z" />
        <path {...p} d="M16 12.2h1.4a2.2 2.2 0 0 1 0 4.4H16M3.5 21h14" />
        <path pathLength={1} className="steam" d="M8.5 8.6c-.9-1 .9-2 0-3.2" />
        <path pathLength={1} className="steam s2" d="M12.3 8.6c-.9-1 .9-2 0-3.2" />
      </>
    ),
    bathroom: (
      <>
        <path {...p} d="M5 21V7.6a4 4 0 0 1 7.8-1.3" />
        <path {...p} d="M10.6 9.4a3.4 3.4 0 0 1 6.4-1.7l-6.2 2.6Z" />
        <path className="drop" d="M12.6 13.2v1.4" />
        <path className="drop d2" d="M15.6 12.4v1.4" />
      </>
    ),
    mountain: (
      <>
        <path {...p} className="ic-draw ridge" d="M2.5 19 9 8.6l3.8 6.1" />
        <path {...p} className="ic-draw ridge r2" d="M10.6 19l5.2-8.2 5.7 8.2" />
        <path {...p} d="M2.5 19h19" />
      </>
    ),
    card: (
      <g className="gcard">
        <rect {...p} x="3" y="6" width="18" height="12.5" rx="2" />
        <path {...p} d="M3 10.2h18M6.5 14.8h4.5" />
        <path {...p} d="M15.6 14.9l.8-1.8.8 1.8M15.9 14.3h1.1" />
      </g>
    ),
  };
  return (
    <svg className="amenity-icon h-8 w-8 overflow-visible text-gold md:h-9 md:w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {body[kind]}
    </svg>
  );
}

/** Drawn background for cards without a real photo: a fine engraved card outline. */
function CardGraphic() {
  return (
    <svg aria-hidden viewBox="0 0 200 120" className="absolute right-[-6%] top-1/2 h-[130%] -translate-y-1/2 text-gold/30">
      <g className="gcard-bg" fill="none" stroke="currentColor" strokeWidth=".8">
        <rect x="70" y="22" width="110" height="70" rx="8" transform="rotate(-8 125 57)" />
        <path d="M80 44h100" transform="rotate(-8 125 57)" />
        <text x="140" y="80" transform="rotate(-8 125 57)" fill="currentColor" stroke="none" fontFamily="Cormorant Garamond, serif" fontSize="22" fontStyle="italic">M+</text>
      </g>
    </svg>
  );
}

export function AmenityCard({ a, lang, index }: { a: Amenity; lang: Lang; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  // touch: play the card's micro-animation once, never block scrolling
  const tap = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const el = ref.current;
    if (!el) return;
    el.classList.remove('tap'); void el.offsetWidth; el.classList.add('tap');
    window.setTimeout(() => el.classList.remove('tap'), 1300);
  };
  return (
    <li
      ref={ref}
      data-kind={a.kind}
      data-i={index}
      onPointerDown={tap}
      tabIndex={0}
      className="amenity js-am-card group relative isolate flex min-h-[112px] flex-col justify-between overflow-hidden rounded-[14px] bg-pine p-3.5 outline-none min-[360px]:p-4 focus-visible:ring-2 focus-visible:ring-gold sm:min-h-[128px] sm:p-5 lg:min-h-[156px] lg:p-6"
    >
      {/* real photo, fading in from the right */}
      {a.photo ? (
        <div className="amenity-photo absolute inset-y-0 right-0 -z-10 w-[78%]">
          <picture>
            <source type="image/avif" srcSet={`${BASE}${a.photo}.avif`} />
            <source type="image/webp" srcSet={`${BASE}${a.photo}.webp`} />
            <img src={`${BASE}${a.photo}.jpg`} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" style={{ objectPosition: a.focus }} />
          </picture>
        </div>
      ) : (
        <div className="absolute inset-0 -z-10"><CardGraphic /></div>
      )}
      <div aria-hidden className="amenity-shade absolute inset-0 -z-10" />
      <span aria-hidden className="amenity-border pointer-events-none absolute inset-0 rounded-[14px]" />
      <span aria-hidden className="amenity-sheen pointer-events-none absolute inset-x-5 top-0 h-px origin-left" />

      <Icon kind={a.kind} />
      <div className="mt-4">
        <h3 lang="de" className="text-[14px] font-semibold leading-tight text-cream [hyphens:auto] [overflow-wrap:anywhere] min-[360px]:text-[15px] sm:text-[17px] lg:text-[19px]">{a.label[lang]}</h3>
        {a.detail && <p className="mt-1 hidden text-[13px] text-cream/70 sm:block">{a.detail[lang]}</p>}
      </div>
    </li>
  );
}
