import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { FAR, SLEIGH_TEL, STOPS, TOWNS, W_IMG, WINTER_COPY, directions, type WStop } from '../../content/winterPage';
import { S_DOOR, S_GLIDE, S_HERO, S_SIDE, S_STOPS, SUMMER_COPY } from '../../content/summerPage';
import { useIsMobile, useReducedMotion } from '../../lib/hooks';
import { SeasonFx } from '../SeasonFx';
import { Icon } from '../pension/PensionRooms';
import { PensionFinalCTA } from '../pension/PensionFinalCTA';
import { MountainTeaser } from '../mountain/MountainTeaser';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const img = (n: string) => `${W_IMG}${n}.webp`;
const THEME: Record<Season, React.CSSProperties> = {
  winter: { ['--w-bg' as string]: '#0b1424', ['--w-ice' as string]: '#cfe3ff', ['--w-ice-rgb' as string]: '207,227,255' },
  summer: { ['--w-bg' as string]: '#0e1a13', ['--w-ice' as string]: '#dcebc8', ['--w-ice-rgb' as string]: '220,235,200' },
};
const PIN = ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z', 'M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z'];
const CAR = ['M4 16v-4l2-5h12l2 5v4', 'M3 16h18v3H3Z', 'M7 19v1.5M17 19v1.5', 'M7.5 13.5h.01M16.5 13.5h.01'];
const EXT = ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'];
const PHONE = ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z'];

/** radial distance compass: real bearing, straight-line distance on a sqrt scale */
const C = 250, R = 205, CAP = 80;
const rad = (km: number) => Math.sqrt(Math.min(km, CAP) / CAP) * R;
/** small vertical nudges so neighbouring labels never overlap */
const SHORT: Record<string, string> = { zell: 'Zell am See', krimml: 'Krimml', wildkogel: 'Wildkogel', hintersee: 'Hintersee', panoramabahn: 'Panoramabahn', stauseen: 'Stauseen Kaprun', weisssee: 'Weißsee' };
const DY: Record<string, number> = { zell: -9, spa: 2, kitzsteinhorn: 12, wildkogel: -6, krimml: 6, stauseen: -10, weisssee: 10, mittersill: 0, panoramabahn: -17, hintersee: 4 };
/** labels forced to the left of their dot */
const LEFT = new Set(['hintersee']);
const pt = (bearing: number, km: number) => { const a = (bearing * Math.PI) / 180, r = rad(km); return { x: C + Math.sin(a) * r, y: C - Math.cos(a) * r }; };

function Compass({ lang, active, onPick, big, stops, short }: { lang: Lang; active: string | null; onPick: (id: string) => void; big: boolean; stops: WStop[]; short: boolean }) {
  const t = WINTER_COPY[lang];
  const f = big ? 1.4 : 1;
  const items = [
    ...stops.map((s) => ({ id: s.id, name: s.name, km: s.km, bearing: s.bearing, air: s.air, kind: 'stop' as const })),
    ...TOWNS.map((s) => ({ id: s.id, name: s.name, km: s.km, bearing: s.bearing, air: s.air, kind: 'town' as const })),
  ];
  return (
    <svg viewBox="0 0 500 500" className="w-full overflow-visible" role="img" aria-label={t.compass}>
      <defs>
        <radialGradient id="wc-glow"><stop offset="0" stopColor="var(--k-gold-light)" stopOpacity=".55" /><stop offset="1" stopColor="var(--k-gold-light)" stopOpacity="0" /></radialGradient>
        <linearGradient id="wc-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--w-ice)" stopOpacity="0" /><stop offset="1" stopColor="var(--w-ice)" stopOpacity=".22" /></linearGradient>
      </defs>
      {[5, 15, 30, 75].map((k) => (
        <g key={k} className="js-wc-ring" style={{ transformOrigin: '250px 250px' }}>
          <circle cx={C} cy={C} r={rad(k)} fill="none" stroke="rgba(var(--w-ice-rgb),.16)" strokeDasharray={k === 75 ? '0' : '2 5'} />
          <text x={C - Math.sin(0.35) * rad(k) - 4} y={C + Math.cos(0.35) * rad(k) + 12} textAnchor="end" fill="rgba(var(--w-ice-rgb),.45)" fontSize="10" fontWeight="600" letterSpacing=".08em">{k} km</text>
        </g>
      ))}
      {['N', 'O', 'S', 'W'].map((d, i) => {
        const p = pt(i * 90, CAP * 1.17);
        return <text key={d} x={p.x} y={p.y + 4} textAnchor="middle" fill="rgba(var(--w-ice-rgb),.5)" fontSize="12" fontWeight="700" className="js-wc-ring">{lang === 'en' && d === 'O' ? 'E' : d}</text>;
      })}
      {/* radar sweep */}
      <g className="wc-sweep" style={{ transformOrigin: '250px 250px' }}><path d={`M${C} ${C} L${C + R} ${C} A${R} ${R} 0 0 0 ${C + R * Math.cos(-0.5)} ${C + R * Math.sin(-0.5)} Z`} fill="url(#wc-beam)" /></g>
      {items.map((it) => {
        const p = pt(it.bearing, it.air), on = active === it.id, right = p.x >= C - 4 && !LEFT.has(it.id), dy = DY[it.id] ?? 0;
        const town = it.kind === 'town';
        return (
          <g key={it.id} className={`js-wc-pt wc-pt ${on ? 'is-on' : ''}`} tabIndex={town ? -1 : 0} role={town ? undefined : 'button'} aria-label={town ? undefined : `${it.name} · ${it.km} km`}
            onClick={() => !town && onPick(it.id)} onKeyDown={(e) => { if (!town && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(it.id); } }} style={{ cursor: town ? 'default' : 'pointer' }}>
            <line className="js-wc-ray" x1={C} y1={C} x2={p.x} y2={p.y} stroke={town ? 'rgba(var(--w-ice-rgb),.18)' : 'rgba(232,203,150,.4)'} strokeWidth="1" pathLength={1} strokeDasharray="1" />
            <circle cx={p.x} cy={p.y} r={on ? 16 : 11} fill="url(#wc-glow)" className="wc-halo" />
            <circle cx={p.x} cy={p.y} r={town ? 3.2 : 4.6} fill={town ? 'var(--w-ice)' : 'var(--k-gold-light)'} stroke="var(--w-bg)" strokeWidth="1.5" />
            <text x={p.x + (right ? 9 : -9)} y={p.y - 2 * f + dy * f} textAnchor={right ? 'start' : 'end'} fill={town ? 'rgba(var(--w-ice-rgb),.7)' : '#f4efe4'} fontSize={(town ? 10.5 : 12) * f} fontWeight="600">{big || short ? SHORT[it.id] ?? it.name : it.name}</text>
            <text x={p.x + (right ? 9 : -9)} y={p.y + 11 * f + dy * f} textAnchor={right ? 'start' : 'end'} fill={town ? 'rgba(var(--w-ice-rgb),.5)' : 'var(--k-gold-light)'} fontSize={10 * f} fontWeight="700" className="lnum">{it.km} km</text>
          </g>
        );
      })}
      <circle cx={C} cy={C} r="26" fill="url(#wc-glow)" className="wc-home-pulse" style={{ transformOrigin: '250px 250px' }} />
      <path d={`M${C - 9} ${C + 6}V${C - 2}l9-8 9 8v8Z`} fill="#f4efe4" stroke="var(--w-bg)" strokeWidth="1.2" />
      <text x={C} y={C + 22} textAnchor="middle" fill="#f4efe4" fontSize="10.5" fontWeight="700" letterSpacing=".14em">{t.home.toUpperCase()}</text>
    </svg>
  );
}

function Stop({ s, i, lang, total }: { s: WStop; i: number; lang: Lang; total: number }) {
  const t = WINTER_COPY[lang];
  const [lead, ...rest] = s.pics;
  return (
    <article id={`w-${s.id}`} data-i={i} className="js-w-stop scroll-mt-28 border-t border-white/10 py-16 first:border-t-0 first:pt-4 md:py-24">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="lnum text-[12px] font-semibold uppercase tracking-[.3em] text-gold-light">{String(i + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        <span className="text-[12px] font-semibold uppercase tracking-[.22em] text-cream/55">{s.tag[lang]}</span>
      </div>
      <h2 className="js-w-rev mt-3 font-display font-normal leading-[.98] tracking-[-0.02em] text-cream" style={{ fontSize: 'clamp(40px, 5.6vw, 88px)' }}>{s.name}</h2>
      <div className="js-w-rev mt-5 flex flex-wrap items-center gap-2">
        <span className="w-chip lnum"><Icon d={PIN} size={15} w={1.6} />{s.km} {t.km}</span>
        {s.time && <span className="w-chip"><Icon d={CAR} size={15} w={1.5} />{s.time[lang]}</span>}
        {s.facts[lang].map((f) => <span key={f} className="w-chip w-chip-soft">{f}</span>)}
      </div>
      <p className="js-w-rev mt-5 max-w-[620px] text-[16.5px] leading-relaxed text-cream/78 md:text-[18px]">{s.text[lang]}</p>

      {!lead ? (
        <div className="js-w-mask relative mt-9 flex min-h-[220px] items-end overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(120%_90%_at_80%_0%,rgba(var(--w-ice-rgb),.12),transparent_60%)] p-6 md:min-h-[300px] md:p-8">
          <svg aria-hidden viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-gold-light/25">
            {[0, 1, 2, 3, 4, 5, 6].map((k) => <path key={k} fill="none" stroke="currentColor" strokeWidth={k === 0 ? 1.2 : 0.6} d={`M-10 ${170 - k * 18} C 80 ${150 - k * 20}, 150 ${90 - k * 12}, 210 ${70 - k * 8} S 330 ${100 - k * 12}, 410 ${130 - k * 16}`} />)}
          </svg>
          <span aria-hidden className="lnum relative font-display text-[90px] leading-none text-cream/90 md:text-[140px]">{s.km}<span className="text-[.3em] text-gold-light"> km</span></span>
        </div>
      ) : (
      <div className={`mt-9 grid gap-3 md:gap-4 ${rest.length ? 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''}`}>
        <figure className="js-w-mask relative m-0 overflow-hidden rounded-[22px] bg-white/5">
          <img src={lead} alt={`${s.name}`} loading="lazy" decoding="async" className="js-w-img aspect-[16/9] h-full w-full object-cover md:aspect-auto md:min-h-[360px]" />
          <span aria-hidden className="lnum pointer-events-none absolute bottom-3 right-5 font-display text-[64px] leading-none text-white/90 [text-shadow:0_4px_30px_rgba(0,0,0,.45)] md:text-[96px]">{s.km}<span className="text-[.35em]"> km</span></span>
        </figure>
        {rest.length > 0 && (
          <div className={`grid gap-3 md:gap-4 ${rest.length > 2 ? 'grid-cols-2' : rest.length === 2 ? 'grid-cols-2 md:grid-cols-1' : 'grid-cols-1'}`}>
            {rest.map((p, k) => (
              <figure key={p} className={`js-w-mask m-0 overflow-hidden rounded-[18px] bg-white/5 ${rest.length > 2 && k === 0 ? 'col-span-2' : ''}`}>
                <img src={p} alt="" loading="lazy" decoding="async" className="js-w-img aspect-[4/3] h-full w-full object-cover md:aspect-auto md:min-h-[160px]" />
              </figure>
            ))}
          </div>
        )}
      </div>
      )}
      <div className="js-w-rev mt-7 flex flex-wrap gap-3">
        <a href={directions(s.dest)} target="_blank" rel="noopener noreferrer" className="pf-primary inline-flex min-h-[50px] items-center gap-2.5 rounded-full px-6 text-[14.5px] font-semibold"><Icon d={CAR} size={17} w={1.6} />{t.route}</a>
        {s.site && <a href={s.site} target="_blank" rel="noopener noreferrer" className="pf-secondary inline-flex min-h-[50px] items-center gap-2.5 rounded-full px-6 text-[14.5px] font-semibold">{t.web}<Icon d={EXT} size={15} w={1.6} /></a>}
      </div>
    </article>
  );
}

/** Seasonal activities – compass hero, a road trip by distance, the doorstep, nearby towns. */
export function ActivityJourney({ lang, season }: { lang: Lang; season: Season }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const summer = season === 'summer';
  const t = summer ? { ...WINTER_COPY[lang], ...SUMMER_COPY[lang] } : WINTER_COPY[lang];
  const STOPS_ = summer ? S_STOPS : STOPS;
  const [cur, setCur] = useState(0);
  const [hot, setHot] = useState<string | null>(null);
  const kmEl = useRef<HTMLSpanElement>(null);
  const kmVal = useRef({ v: STOPS_[0].km });

  const pick = (id: string) => {
    setHot(id);
    document.getElementById(`w-${id}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const setStop = (i: number) => {
      setCur(i);
      const to = STOPS_[i].km;
      if (kmEl.current) {
        if (reduced) kmEl.current.textContent = String(to);
        else gsap.to(kmVal.current, { v: to, duration: 0.9, ease: 'power3.out', overwrite: true, onUpdate: () => { if (kmEl.current) kmEl.current.textContent = String(Math.round(kmVal.current.v)); } });
      }
    };
    q('.js-w-stop').forEach((el, i) => ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (st) => st.isActive && setStop(i) }));
    ScrollTrigger.create({ trigger: q('.js-w-journey')[0], start: 'top 60%', end: 'bottom 60%', onUpdate: (st) => gsap.set(q('.js-w-roadfill'), { scaleY: st.progress }) });
    const imgs = Array.from(root.current?.querySelectorAll('img') ?? []);
    let tid = 0;
    const refresh = () => { window.clearTimeout(tid); tid = window.setTimeout(() => ScrollTrigger.refresh(), 120); };
    imgs.forEach((im) => { if (!im.complete) im.addEventListener('load', refresh, { once: true }); });
    if (reduced) return;

    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-w-bg'), { scale: 1.15, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 2.4, ease: 'power2.out' }, 0)
      .fromTo(q('.js-w-line'), { yPercent: 115 }, { yPercent: 0, duration: 1.1, stagger: 0.1, ease: 'power4.out' }, 0.25)
      .fromTo(q('.js-w-in'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.7)
      .fromTo(q('.js-wc-ring'), { scale: 0.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.2, stagger: 0.1, ease: 'expo.out' }, 0.5)
      .fromTo(q('.js-wc-ray'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.07, ease: 'power2.out' }, 1.1)
      .fromTo(q('.js-wc-pt circle, .js-wc-pt text'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, stagger: 0.02 }, 1.3);
    gsap.to(q('.js-w-bg'), { yPercent: 10, ease: 'none', scrollTrigger: { trigger: q('.js-w-hero')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });
    q('.js-w-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    q('.js-w-mask').forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.3, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      const im = el.querySelector('.js-w-img'); if (im) gsap.fromTo(im, { scale: 1.2 }, { scale: 1, duration: 1.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    gsap.fromTo(q('.js-w-bar'), { scaleX: 0 }, { scaleX: 1, duration: 1.4, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: q('.js-w-bars')[0], start: 'top 85%', once: true } });
  }, { scope: root, dependencies: [reduced, lang, season] });

  const s = STOPS_[cur];
  return (
    <div ref={root} className="bg-[var(--w-bg)] text-cream" style={THEME[season]}>
      {/* hero: the compass */}
      <section id="top" aria-labelledby="w-title" className="js-w-hero relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={summer ? S_HERO : img('glockner')} alt="" aria-hidden className={`js-w-bg h-full w-full object-cover ${summer ? 'opacity-40' : 'opacity-30'}`} />
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_72%_45%,color-mix(in_srgb,var(--w-bg)_35%,transparent),var(--w-bg)_88%)]" />
          <SeasonFx mode={season} mobile={mobile} reduced={reduced} />
        </div>
        <div className="mx-auto grid max-w-[1440px] items-center gap-6 px-5 pb-16 pt-[136px] sm:px-6 md:px-10 md:pb-24 md:pt-[180px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:px-14 lg:pt-[230px]">
          <div className="min-w-0">
            <p className="js-w-in flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.32em] text-[var(--w-ice)] md:text-[12.5px]"><span aria-hidden className="h-px w-8 bg-[var(--w-ice)]" />{t.eyebrow}</p>
            <h1 id="w-title" className="mt-5 font-display font-normal leading-[.98] tracking-[-0.02em]" style={{ fontSize: 'clamp(44px, 6.4vw, 104px)' }}>
              {t.title.map((l, i) => <span key={i} className="block overflow-hidden pb-[0.07em]"><span className={`js-w-line block ${i === 2 ? 'italic text-gold-light' : ''}`}>{l}</span></span>)}
            </h1>
            <p className="js-w-in mt-6 max-w-[500px] text-[16px] leading-relaxed text-cream/75 md:text-[18px]">{t.sub}</p>
            <a href={`#w-${STOPS_[0].id}`} onClick={(e) => { e.preventDefault(); pick(STOPS_[0].id); }} className="js-w-in mt-8 inline-flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[.26em] text-cream/80 hover:text-cream">
              <span className="w-cue relative block h-10 w-px overflow-hidden bg-cream/25" />{t.scroll}
            </a>
          </div>
          <div className="min-w-0">
            <div className="mx-auto max-w-[560px]">
              <Compass lang={lang} active={hot} onPick={pick} big={mobile} stops={STOPS_} short={summer} />
              <p className="js-w-in mt-1 text-center text-[11px] text-[var(--w-ice)]/55">{t.compassNote}</p>
            </div>
          </div>
        </div>
      </section>

      {/* the journey, sorted by distance */}
      <section aria-label={t.eyebrow} className="js-w-journey relative px-5 sm:px-6 md:px-10 lg:px-14">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
          {/* rail */}
          <aside aria-hidden className="max-lg:sticky max-lg:top-[calc(var(--wb-h)+var(--ob-h)+70px)] max-lg:z-20 max-lg:-mx-5 max-lg:px-5 max-lg:py-2.5 max-lg:backdrop-blur-md max-lg:[background:color-mix(in_srgb,var(--w-bg)_85%,transparent)] lg:block">
            <div className="lg:sticky lg:top-[calc(var(--wb-h)+var(--ob-h)+110px)] lg:pt-4">
              <div className="flex items-center gap-4 lg:block">
                <p className="hidden text-[11px] font-semibold uppercase tracking-[.3em] text-[var(--w-ice)]/60 lg:block">{t.road}</p>
                <p className="lnum font-display leading-none text-gold-light lg:mt-2" style={{ fontSize: mobile ? 34 : 'clamp(80px, 8vw, 140px)' }}><span ref={kmEl}>{STOPS_[0].km}</span><span className="text-[.35em] text-cream/60"> km</span></p>
                <div className="min-w-0 lg:mt-4">
                  <p key={s.id} className="w-fade truncate font-display text-[20px] leading-tight lg:text-[28px]">{s.name}</p>
                  <p className="text-[12.5px] text-cream/60">{s.time ? `${t.drive}: ${s.time[lang]}` : s.tag[lang]}</p>
                </div>
              </div>
              <ol className="relative mt-8 hidden flex-col gap-3 pl-6 lg:flex">
                <span className="absolute bottom-1 left-[5px] top-1 w-px bg-white/12" />
                <span className="js-w-roadfill absolute bottom-1 left-[5px] top-1 w-px origin-top scale-y-0 bg-gold-light" />
                {STOPS_.map((x, i) => (
                  <li key={x.id} className="relative">
                    <span className={`absolute -left-6 top-1.5 h-[11px] w-[11px] rounded-full border-2 transition-colors duration-300 ${i <= cur ? 'border-gold-light bg-gold-light' : 'border-white/30 bg-[var(--w-bg)]'}`} />
                    <button type="button" tabIndex={-1} onClick={() => pick(x.id)} className={`text-left text-[13.5px] transition-colors ${i === cur ? 'font-semibold text-cream' : 'text-cream/50 hover:text-cream/80'}`}>
                      <span className="lnum">{x.km}</span> km · {x.name}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
          <div className="min-w-0 pb-10">
            {STOPS_.map((x, i) => <Stop key={x.id} s={x} i={i} lang={lang} total={STOPS_.length} />)}
            <p className="pb-6 text-[12px] text-cream/40">{t.source}</p>
          </div>
        </div>
      </section>

      {/* doorstep */}
      <section aria-labelledby="w-near" className="bg-[#FAF8F5] px-5 py-24 text-ink sm:px-6 md:px-10 md:py-32 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <p className="js-w-rev text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{t.nearEyebrow}</p>
          <h2 id="w-near" className="js-w-rev mt-3 font-display font-normal leading-[1.02] tracking-[-0.015em]" style={{ fontSize: 'clamp(36px, 4.6vw, 70px)' }}>{t.nearTitle}</h2>
          {summer ? (
            <div className="mt-10 grid gap-5 md:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
              <figure className="js-w-mask relative m-0 overflow-hidden rounded-[24px] max-lg:aspect-[4/3]">
                <img src={S_SIDE} alt="" loading="lazy" className="js-w-img h-full w-full object-cover" />
                <figcaption className="absolute bottom-4 left-5 text-[11px] font-semibold uppercase tracking-[.3em] text-white/90">{SUMMER_COPY[lang].sideCap}</figcaption>
              </figure>
              <ul className="grid gap-px overflow-hidden rounded-[24px] border border-ink/[.07] bg-ink/[.07] sm:grid-cols-2">
                {S_DOOR.map((d) => (
                  <li key={d.n + d[lang][0]} className="js-w-rev flex flex-col bg-white p-6 md:p-8">
                    <span className="lnum font-display text-[56px] leading-none text-pine md:text-[68px]">{d.n === '0' ? '↘' : d.n}{d.n !== '0' && <span className="text-[.35em] text-goldink"> {d.u}</span>}</span>
                    <h3 className="mt-4 font-display text-[26px] leading-tight">{d[lang][0]}</h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-ink/65">{d[lang][1]}</p>
                  </li>
                ))}
              </ul>
              <article className="js-w-rev relative overflow-hidden rounded-[24px] lg:col-span-2">
                <img src={S_GLIDE} alt={SUMMER_COPY[lang].glide.title} loading="lazy" className="aspect-[16/10] w-full object-cover md:aspect-[21/9]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
                <div className="absolute inset-y-0 left-0 flex max-w-[520px] flex-col justify-end p-6 text-white md:justify-center md:p-12">
                  <span className="w-chip self-start">{SUMMER_COPY[lang].glide.tag}</span>
                  <h3 className="mt-4 font-display text-[36px] leading-none md:text-[60px]">{SUMMER_COPY[lang].glide.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/85 md:text-[17px]">{SUMMER_COPY[lang].glide.text}</p>
                </div>
              </article>
            </div>
          ) : (
          <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-2 md:gap-6">
            {[{ p: 'snowshoe', c: t.shoe }, { p: 'sleigh', c: t.sleigh }].map(({ p, c }, i) => (
              <article key={p} className="js-w-rev overflow-hidden rounded-[24px] border border-ink/[.07] bg-white">
                <div className="js-w-mask overflow-hidden"><img src={img(p)} alt={c.title} loading="lazy" className="js-w-img aspect-[16/10] w-full object-cover" /></div>
                <div className="p-6 md:p-8">
                  <h3 className="font-display text-[30px] leading-tight md:text-[36px]">{c.title}</h3>
                  <p className="mt-2 text-[15.5px] leading-relaxed text-ink/68">{c.text}</p>
                  {i === 1 && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
                      <span className="text-[14px] font-semibold text-ink/80">{t.sleigh.who}</span>
                      <a href={`tel:${SLEIGH_TEL}`} className="pr-btn-primary inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold"><Icon d={PHONE} size={16} w={1.6} /><span className="lnum">+43 664 205 21 68</span></a>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          )}
          {/* towns */}
          <div className="mt-24 md:mt-32">
            <p className="js-w-rev text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{t.townsEyebrow}</p>
            <h2 className="js-w-rev mt-3 font-display font-normal leading-[1.02] tracking-[-0.015em]" style={{ fontSize: 'clamp(36px, 4.6vw, 70px)' }}>{t.townsTitle}</h2>
            {!summer && <ul className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3 md:gap-5">
              {TOWNS.map((x) => (
                <li key={x.id} className="js-w-rev group relative overflow-hidden rounded-[22px]">
                  <img src={x.pic} alt={x.name} loading="lazy" className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] md:aspect-[4/3]" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-5 bottom-4 flex items-end justify-between text-white">
                    <span className="font-display text-[30px] leading-none">{x.name}</span>
                    <span className="lnum font-display text-[40px] leading-none">{x.km}<span className="text-[.4em]"> km</span></span>
                  </div>
                </li>
              ))}
            </ul>}
            <ul className="js-w-bars mt-10 flex flex-col gap-3">
              {[...TOWNS.map((x) => ({ name: x.name, km: x.km })), ...FAR].map((x) => (
                <li key={x.name} className="grid grid-cols-[96px_minmax(0,1fr)_64px] items-center gap-3 text-[14px] md:grid-cols-[130px_minmax(0,1fr)_80px]">
                  <span className="font-semibold text-ink/80">{x.name}</span>
                  <span className="relative h-[6px] overflow-hidden rounded-full bg-ink/[.07]"><span className="js-w-bar absolute inset-y-0 left-0 origin-left rounded-full bg-[linear-gradient(90deg,var(--k-pine),var(--k-gold))]" style={{ width: `${(x.km / 424) * 100}%` }} /></span>
                  <span className="lnum text-right text-ink/60">{x.km} km</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <MountainTeaser lang={lang} />
      <PensionFinalCTA lang={lang} />
    </div>
  );
}

export const WinterPage = ({ lang }: { lang: Lang }) => <ActivityJourney lang={lang} season="winter" />;
export const SummerPage = ({ lang }: { lang: Lang }) => <ActivityJourney lang={lang} season="summer" />;
