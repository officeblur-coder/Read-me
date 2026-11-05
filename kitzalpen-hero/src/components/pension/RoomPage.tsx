import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang } from '../../content/hero';
import { BOOK_ROOMS, PR_COPY, ROOM_KEYS, ROOMS_ROUTE, STAY_COPY, roomData, roomRoute, type RoomKey } from '../../content/pensionPage';
import { ROOM_COVERS, ROOM_GALLERIES } from '../../content/pensionRoomPhotos';
import { useReducedMotion } from '../../lib/hooks';
import { Icon, I, PRPicture } from './PensionRooms';
import { PensionFinalCTA } from './PensionFinalCTA';
import { tr } from '../../lib/i18n';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ICON = {
  tv: ['M3.5 6h17v11h-17Z', 'M9 20h6'],
  wifi: ['M2.5 9a14 14 0 0 1 19 0', 'M5.5 12.3a9.5 9.5 0 0 1 13 0', 'M8.6 15.5a5 5 0 0 1 6.8 0', 'M12 19h.01'],
  bath: ['M4 12h16v2.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 14.5Z', 'M6 12V6a2 2 0 0 1 3.8-.8', 'M7 19l-1 2M17 19l1 2'],
  shower: ['M5 20V7a3 3 0 0 1 6 0', 'M8 8h7l-1.5 3.5h-4Z', 'M10 14v1M12.5 14v2M15 14v1'],
};

/** Full-screen photo viewer for the room gallery. */
function Lightbox({ k, start, lang, onClose }: { k: RoomKey; start: number; lang: Lang; onClose: () => void }) {
  const pics = ROOM_GALLERIES[k], n = pics.length, t = PR_COPY[lang];
  const [i, setI] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const x0 = useRef<number | null>(null);
  useEffect(() => {
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden'; closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % n);
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + n) % n);
    };
    window.addEventListener('keydown', key);
    return () => { html.style.overflow = prev; window.removeEventListener('keydown', key); };
  }, [n, onClose]);
  const p = pics[i];
  return (
    <div role="dialog" aria-modal="true" aria-label={t.rooms[k].name} className="rp-lb fixed inset-0 z-[80] flex flex-col bg-[#0b100d]/96 text-white backdrop-blur-sm"
      onPointerDown={(e) => { x0.current = e.clientX; }} onPointerUp={(e) => { if (x0.current == null) return; const d = e.clientX - x0.current; x0.current = null; if (Math.abs(d) > 50) setI((v) => (v + (d < 0 ? 1 : -1) + n) % n); }}>
      <div className="flex items-center justify-between px-5 py-4 md:px-8">
        <span className="lnum font-display text-[20px]">{String(i + 1).padStart(2, '0')}<span className="text-white/45"> / {String(n).padStart(2, '0')}</span></span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t.close} className="rs-nav grid h-11 w-11 place-items-center rounded-full"><Icon d={['M6 6l12 12M18 6 6 18']} size={20} w={1.6} /></button>
      </div>
      <div className="relative min-h-0 flex-1 px-3 pb-3 md:px-20 md:pb-8">
        <div key={p.name} className="rp-lb-img h-full w-full">
          <PRPicture pic={p} lang={lang} sizes="100vw" eager className="h-full w-full select-none object-contain" />
        </div>
        <button type="button" onClick={() => setI((i - 1 + n) % n)} aria-label={t.prev} className="rs-nav absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full md:grid md:left-6"><span className="rotate-180"><Icon d={I.arrow} size={18} w={1.8} /></span></button>
        <button type="button" onClick={() => setI((i + 1) % n)} aria-label={t.next} className="rs-nav absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full md:grid md:right-6"><Icon d={I.arrow} size={18} w={1.8} /></button>
      </div>
      <p className="px-5 pb-[calc(16px+env(safe-area-inset-bottom,0px))] text-center text-[13px] text-white/65 md:pb-6">{p.alt[lang]}</p>
    </div>
  );
}

/** Room category page (preview route #room-<key>; live: /rooms/<slug>/). */
export function RoomPage({ k, lang }: { k: RoomKey; lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [lb, setLb] = useState<number | null>(null);
  const closeLb = useCallback(() => setLb(null), []);
  const t = PR_COPY[lang], s = STAY_COPY[lang];
  const r = roomData(k), c = t.rooms[k], pics = ROOM_GALLERIES[k], cover = ROOM_COVERS[k];
  const no = ROOM_KEYS.indexOf(k) + 1;
  const others = ROOM_KEYS.filter((x) => x !== k);

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-rp-bg'), { scale: 1.12, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo(q('.js-rp-frame'), { clipPath: 'inset(100% 0% 0% 0% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.3, ease: 'expo.out' }, 0.3)
      .fromTo(q('.js-rp-frame img'), { scale: 1.2 }, { scale: 1, duration: 1.8 }, 0.3)
      .fromTo(q('.js-rp-line'), { yPercent: 110 }, { yPercent: 0, duration: 1.05, stagger: 0.08, ease: 'power4.out' }, 0.35)
      .fromTo(q('.js-rp-in'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.6)
      .fromTo(q('.js-rp-fact'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.9);
    q('.js-rp-rev').forEach((el) => {
      gsap.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    q('.js-rp-tile').forEach((el, i) => {
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.2, delay: (i % 3) * 0.08, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }, { scope: root, dependencies: [reduced, k] });

  const facts = [
    { k: t.facts.rooms, v: String(r.count) },
    { k: t.facts.guests, v: String(r.guests) },
    { k: t.facts.size, v: `${r.m2} m²` },
    { k: t.facts.beds, v: r.beds[lang] },
  ];
  const incl = [{ i: ICON.tv, l: t.incl[0] }, { i: ICON.wifi, l: t.incl[1] }, { i: ICON.bath, l: t.incl[2] }, { i: ICON.shower, l: t.incl[3] }];
  // mosaic: first photo large, the rest around it
  const span = (i: number) => (i === 0 ? 'md:col-span-2 md:row-span-2'
    : pics.length === 4 && i === 3 ? 'md:col-span-3'
    : pics.length === 5 && i === 3 ? 'md:col-span-2' : '');

  return (
    <div ref={root} key={k}>
      {/* hero */}
      <section id="top" aria-labelledby="rp-title" className="relative isolate overflow-hidden bg-deep text-cream">
        <div aria-hidden className="js-rp-bg absolute inset-0 -z-10">
          <PRPicture pic={cover} lang={lang} sizes="100vw" eager alt="" className="h-full w-full scale-110 object-cover opacity-35 blur-[18px]" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,color-mix(in_srgb,var(--k-deep)_94%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_80%,transparent)_45%,color-mix(in_srgb,var(--k-deep)_60%,transparent)_100%)]" />
        </div>
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 pb-16 pt-[136px] sm:px-6 md:px-10 md:pb-24 md:pt-[170px] lg:pt-[236px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:px-14">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="js-rp-in text-[12px] text-cream/60">
              <a href="#pension" className="hover:text-cream">{s.breadcrumb.pension}</a><span className="mx-2">/</span>
              <a href={ROOMS_ROUTE} className="hover:text-cream">{s.back}</a><span className="mx-2">/</span><span className="text-cream/90">{c.label}</span>
            </nav>
            <p className="js-rp-in mt-8 text-[11.5px] font-semibold uppercase tracking-[.34em] text-gold-light md:text-[12.5px]">{s.roomNo(no)}</p>
            <h1 id="rp-title" data-i18n-skip className="mt-4 font-display font-normal leading-[1] tracking-[-0.02em]" style={{ fontSize: 'clamp(42px, 6vw, 92px)' }}>
              {tr(c.name).split(' ').reduce<string[][]>((acc, w) => { const l = acc[acc.length - 1]; if (!l || l.join(' ').length + w.length > 16) acc.push([w]); else l.push(w); return acc; }, []).map((l, i) => (
                <span key={i} className="block overflow-hidden pb-[0.08em]"><span className="js-rp-line block">{l.join(' ')}</span></span>
              ))}
            </h1>
            <p className="js-rp-in mt-5 font-display text-[22px] italic leading-snug text-gold-light md:text-[27px]">{c.text}</p>
            <p className="js-rp-in mt-4 max-w-[540px] text-[15.5px] leading-relaxed text-cream/80 md:text-[17px]">{s.desc[k]}</p>
            <div className="js-rp-in mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a href={BOOK_ROOMS} target="_blank" rel="noopener noreferrer" className="pf-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-8 text-[15.5px] font-semibold">{s.bookThis}<Icon d={I.arrow} size={17} w={1.8} /></a>
              <a href={ROOMS_ROUTE} className="pf-secondary inline-flex min-h-[54px] items-center justify-center rounded-full px-8 text-[15.5px] font-semibold">{s.back}</a>
            </div>
          </div>
          <div className="relative min-w-0">
            <div className="js-rp-frame relative aspect-[4/3.4] overflow-hidden rounded-[24px] shadow-[0_40px_80px_-40px_rgba(0,0,0,.7)]">
              <button type="button" onClick={() => setLb(0)} aria-label={s.openPhoto(1)} className="group block h-full w-full">
                <PRPicture pic={pics[0]} lang={lang} sizes="(min-width:1024px) 50vw, 100vw" eager className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </button>
            </div>
            <div className="js-rp-in absolute -bottom-5 left-5 rounded-[18px] bg-[#FAF8F5] px-5 py-4 text-ink shadow-[0_20px_40px_-24px_rgba(0,0,0,.6)] md:-left-8 md:bottom-10">
              <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-goldink">{t.ideal}</p>
              <p className="mt-1 max-w-[220px] font-display text-[19px] leading-tight">{r.idealFor[lang]}</p>
            </div>
          </div>
        </div>
        {/* facts strip */}
        <div className="border-t border-cream/12">
          <dl className="mx-auto grid max-w-[1440px] grid-cols-2 px-5 sm:px-6 md:grid-cols-4 md:px-10 lg:px-14">
            {facts.map((f, i) => (
              <div key={f.k} className={`js-rp-fact py-5 md:py-7 ${i % 2 ? 'pl-5' : 'pr-5'} ${i < 2 ? 'max-md:border-b max-md:border-cream/12' : ''} md:px-6 md:first:pl-0 ${i > 0 ? 'md:border-l md:border-cream/12' : ''} ${i % 2 ? 'max-md:border-l max-md:border-cream/12' : ''}`}>
                <dt className="text-[10.5px] font-semibold uppercase tracking-[.22em] text-cream/55">{f.k}</dt>
                <dd className="lnum mt-1.5 font-display text-[24px] leading-tight md:text-[30px]">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* gallery mosaic */}
      <section aria-labelledby="rp-gal" className="bg-[#FAF8F5] px-5 py-20 text-ink sm:px-6 md:px-10 md:py-28 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="js-rp-rev flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{s.galleryEyebrow}</p>
              <h2 id="rp-gal" className="mt-3 font-display font-normal leading-[1.04] tracking-[-0.015em]" style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}>{s.galleryTitle}</h2>
            </div>
            <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-ink/50">{t.photos(pics.length)}</p>
          </div>
          <ul className="mt-10 grid auto-rows-[220px] grid-cols-1 gap-3 sm:grid-cols-2 md:mt-14 md:auto-rows-[250px] md:grid-cols-3 md:gap-4 lg:auto-rows-[290px]">
            {pics.map((p, i) => (
              <li key={p.name} className={`js-rp-tile min-w-0 overflow-hidden rounded-[18px] ${span(i)} ${i === 0 ? 'max-md:row-span-2 sm:col-span-2' : ''}`}>
                <button type="button" onClick={() => setLb(i)} aria-label={s.openPhoto(i + 1)} className="group relative block h-full w-full overflow-hidden bg-pine/10 outline-none focus-visible:ring-2 focus-visible:ring-gold">
                  <PRPicture pic={p} lang={lang} sizes={i === 0 ? '(min-width:768px) 66vw, 100vw' : '(min-width:768px) 33vw, 100vw'} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                  <span aria-hidden className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"><Icon d={['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5']} size={16} /></span>
                </button>
              </li>
            ))}
          </ul>

          {/* overview */}
          <div className="mt-20 grid gap-10 md:mt-28 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <div className="js-rp-rev">
              <p className="text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{s.detailsEyebrow}</p>
              <h2 className="mt-3 font-display font-normal leading-[1.04] tracking-[-0.015em]" style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}>{s.detailsTitle}</h2>
              <p className="mt-5 max-w-[460px] text-[16px] leading-relaxed text-ink/70">{s.desc[k]}</p>
              {r.maxCombined && <p className="mt-5 max-w-[460px] rounded-[14px] bg-pine/[.06] px-4 py-3 text-[14.5px] text-pine">{t.combined(r.maxCombined)}</p>}
            </div>
            <div className="js-rp-rev">
              <p className="text-[10.5px] font-semibold uppercase tracking-[.22em] text-ink/50">{t.inclusive}</p>
              <ul className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-ink/[.08] sm:grid-cols-4">
                {incl.map((x) => (
                  <li key={x.l} className="flex flex-col items-start gap-3 bg-[#FAF8F5] px-5 py-6">
                    <span className="text-goldink"><Icon d={x.i} size={28} w={1.2} /></span>
                    <span className="text-[14.5px] font-semibold">{x.l}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-6 divide-y divide-ink/[.08] border-y border-ink/[.08]">
                {[...facts, { k: t.ideal, v: r.idealFor[lang] }].map((f) => (
                  <div key={f.k} className="flex items-baseline justify-between gap-6 py-3.5">
                    <dt className="text-[13px] uppercase tracking-[.16em] text-ink/55">{f.k}</dt>
                    <dd className="lnum text-right text-[15.5px] font-medium">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* other rooms */}
          <div className="mt-20 md:mt-28">
            <div className="js-rp-rev flex items-end justify-between gap-4">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[.34em] text-goldink">{s.others}</p>
                <h2 className="mt-3 font-display font-normal leading-[1.04] tracking-[-0.015em]" style={{ fontSize: 'clamp(30px, 3.4vw, 48px)' }}>{s.othersTitle}</h2>
              </div>
              <a href={ROOMS_ROUTE} className="hidden shrink-0 text-[12px] font-semibold uppercase tracking-[.2em] text-pine underline decoration-gold underline-offset-[6px] sm:inline">{s.back}</a>
            </div>
            <ul className="mt-8 grid gap-5 md:grid-cols-3">
              {others.map((o) => {
                const ro = roomData(o), co = t.rooms[o];
                return (
                  <li key={o} className="js-rp-rev min-w-0">
                    <a href={roomRoute(o)} className="pr-card group flex h-full items-stretch overflow-hidden rounded-[20px] border border-ink/[.07] bg-white md:flex-col">
                      <div className="relative w-[42%] shrink-0 overflow-hidden md:aspect-[4/3] md:w-full">
                        <PRPicture pic={ROOM_COVERS[o]} lang={lang} sizes="(min-width:768px) 33vw, 40vw" className="pr-card-img absolute inset-0 h-full w-full object-cover" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
                        <span className="font-display text-[21px] leading-tight md:text-[24px]">{co.name}</span>
                        <span className="mt-1 text-[13px] text-ink/60">{t.guests(ro.guests)} · {ro.m2} m²</span>
                        <span className="mt-auto flex items-center justify-between pt-3 text-[11.5px] font-semibold uppercase tracking-[.2em] text-goldink">
                          {s.discover}<span aria-hidden className="pr-arrow grid h-9 w-9 place-items-center rounded-full"><Icon d={I.arrow} size={15} w={1.8} /></span>
                        </span>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <PensionFinalCTA lang={lang} />
      {lb !== null && <Lightbox k={k} start={lb} lang={lang} onClose={closeLb} />}
    </div>
  );
}
