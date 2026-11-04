import type { Lang } from '../../content/hero';
import type { Activity, ActivityIcon } from '../../content/activities';

const BASE = `${import.meta.env.BASE_URL}images/activities/`;

const ICONS: Record<ActivityIcon, string[]> = {
  hike: ['M13.5 5.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z', 'M10 21l2.2-6.2 2.6 2.4V21', 'M8.5 11.5l2.4-3.6 3.8 1.2 2 3', 'M12.2 14.8l-1.3-6.9', 'M18.5 9.5 17 21'],
  bike: ['M5.5 17.5a3.5 3.5 0 1 0 0-.01Z', 'M18.5 17.5a3.5 3.5 0 1 0 0-.01Z', 'M5.5 17.5 9 10h6l3.5 7.5', 'M12 17.5 9 10M15 10l-1.5-3H16'],
  lake: ['M2.5 18c1.6 0 1.6 1.2 3.2 1.2S7.3 18 8.9 18s1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 2.9-1.2', 'M3 14.5 8.5 7l3.4 4.6L14.5 8 21 14.5'],
  glider: ['M3 9c4.5-5 13.5-5 18 0', 'M3 9l8.2 9.5M21 9l-8.2 9.5M8.5 6.3 11.4 18M15.5 6.3 12.6 18', 'M11 18.5h2v2.2h-2Z'],
  family: ['M7 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16.5 9a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z', 'M4 21v-6.5A3 3 0 0 1 7 11.5a3 3 0 0 1 3 3V21', 'M14 21v-4.8a2.5 2.5 0 0 1 5 0V21'],
  ski: ['M14.5 5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z', 'M3 19.5l17 2.2', 'M7.5 12.5l4-3.2 3 2.6-2.2 3.6 3 2.6', 'M11.5 9.3 9 6.5', 'M4.5 9.5 9 20'],
  lift: ['M2.5 5.5 21.5 3', 'M12 4.2v3.3', 'M7 7.5h10l1 7.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z', 'M6.6 11.5h10.8'],
  glacier: ['M2.5 19 9 7l3.2 5.5L15 9l6.5 10Z', 'M7 10.7 9 12l1.6-1.3M13.6 11.3l1.4.9 1.3-1'],
  panorama: ['M2.5 18.5 7.5 11l3 4 3.5-6 7.5 9.5', 'M2.5 18.5h19', 'M17.5 6.5a1.8 1.8 0 1 0 0-.01Z'],
  peaks: ['M2 19l6-10 3.5 5.5L15 8.5l7 10.5Z', 'M6.2 12 8 13l1.4-1.2M13.2 11.3l1.8 1 1.4-1.2'],
};
export function ActIcon({ name, size = 22 }: { name: ActivityIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export function ActPic({ stem, alt, sizes, className = '', style }: { stem: string; alt: string; sizes: string; className?: string; style?: React.CSSProperties }) {
  return (
    <picture>
      <source type="image/avif" srcSet={`${BASE}${stem}.avif`} sizes={sizes} />
      <source type="image/webp" srcSet={`${BASE}${stem}.webp`} sizes={sizes} />
      <img src={`${BASE}${stem}.jpg`} alt={alt} loading="lazy" decoding="async" draggable={false} className={`h-full w-full object-cover ${className}`} style={style} />
    </picture>
  );
}

/** Engraved contour drawing for an entry without a confirmed photo. */
function Contours() {
  return (
    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(160deg,var(--k-pine),var(--k-deep))]">
      <svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" className="h-full w-full text-gold/40">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} fill="none" stroke="currentColor" strokeWidth={i === 0 ? 1.1 : 0.6}
            d={`M-10 ${190 - i * 14} C 30 ${170 - i * 16}, 60 ${120 - i * 12}, 92 ${88 - i * 8} S 140 ${110 - i * 10}, 210 ${150 - i * 14}`} />
        ))}
      </svg>
    </div>
  );
}

export function ActivityCard({ a, lang, visit }: { a: Activity; lang: Lang; visit: string }) {
  const Tag = a.href ? 'a' : 'div';
  return (
    <Tag
      {...(a.href ? { href: a.href, target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="act-card js-act-card group flex h-full flex-col overflow-hidden rounded-[16px] border border-pine/10 bg-soft outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <div className="js-act-mask relative aspect-[16/11] overflow-hidden bg-pine/10 lg:aspect-[4/3]">
        {a.photo ? (
          <div className="act-img js-act-img absolute inset-0">
            <ActPic stem={a.photo} alt={a.title[lang]} sizes="(min-width:1024px) 20vw, 80vw" style={{ objectPosition: a.focus }} />
          </div>
        ) : <Contours />}
        {a.fact && (
          <span className="absolute bottom-3 left-3 rounded-full bg-deep/65 px-2.5 py-1 text-[11px] font-semibold tracking-[.04em] text-cream backdrop-blur-sm">{a.fact[lang]}</span>
        )}
        {a.verify && (
          <span className="absolute bottom-3 left-3 rounded-full border border-dashed border-gold/70 px-2.5 py-1 text-[11px] font-semibold text-gold-light">{a.verify[lang]}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5 lg:gap-2 lg:p-5">
        <div className="flex items-center gap-2.5 text-pine">
          <ActIcon name={a.icon} />
          <h3 className="act-title text-[16px] font-semibold leading-tight text-ink md:text-[17px]">{a.title[lang]}</h3>
        </div>
        <p className="line-clamp-2 text-[13.5px] leading-snug text-ink/70 lg:line-clamp-none lg:text-[14px] lg:leading-relaxed">{a.text[lang]}</p>
        <div className="mt-auto flex items-center justify-between pt-2 lg:pt-3">
          <span className="act-line relative text-[12px] font-semibold uppercase tracking-[.14em] text-goldink">{a.href ? visit : ' '}</span>
          <span className="act-arrow grid h-9 w-9 place-items-center rounded-full border border-pine/20 text-pine" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
          </span>
        </div>
      </div>
    </Tag>
  );
}
