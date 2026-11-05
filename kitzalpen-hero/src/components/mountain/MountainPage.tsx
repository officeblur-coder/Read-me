import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { MCOPY, type MCopy } from '../../content/mountainCopy';
import {
  PROFILES, RESORTS, WEBCAMS, directionsUrl, loadConditions, recommend, resortById, skyLabel,
  type ConditionsResult, type Level, type PlannerPreferences, type ResortId, type Style, type Webcam, type Who,
} from '../../content/mountain';
import { BOOKING_ENGINE } from '../BookingBar';
import { useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { Icon, I } from '../pension/PensionRooms';
import { locale } from '../../lib/i18n';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ICO = {
  temp: ['M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0Z', 'M12 9v6'],
  snow: ['M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9', 'M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5'],
  flake: ['M12 4v16M5 8l14 8M5 16l14-8'],
  wind: ['M3 9h11a3 3 0 1 0-3-3', 'M3 15h15a3 3 0 1 1-3 3', 'M3 12h7'],
  sky: ['M12 4V2M4.9 6.9 3.5 5.5M20.5 5.5l-1.4 1.4', 'M8 13a4 4 0 1 1 7.8 1.3A3.5 3.5 0 0 1 16 21H8a3.5 3.5 0 0 1 0-7Z'],
  lift: ['M2.5 5.5 21.5 3', 'M12 4.2v3.3', 'M7 7.5h10l1 7.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z', 'M6.6 11.5h10.8'],
  slope: ['M3 19 9 9l4 5 3-3 5 8Z'],
  mapI: ['M9 4 3 6v14l6-2 6 2 6-2V4l-6 2Z', 'M9 4v14M15 6v14'],
  car: ['M4 16v-4l2-5h12l2 5v4', 'M3 16h18v3H3Z', 'M7 19v1.5M17 19v1.5'],
  cam: ['M3 7h12v10H3Z', 'm15 10 6-3v10l-6-3'],
  ext: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  full: ['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'],
  save: ['M6 3h10l4 4v14H4V3Z', 'M8 3v5h7M8 21v-7h8v7'],
  share: ['M12 4v12M7 9l5-5 5 5', 'M5 14v6h14v-6'],
  print: ['M7 9V3h10v6', 'M5 9h14v8h-3v4H8v-4H5Z'],
  pin: ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z', 'M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z'],
};
const fmtTime = (iso: string, lang: Lang) => new Date(iso).toLocaleString(locale(lang), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' });
const fmtDay = (d: string, lang: Lang) => new Date(`${d}T12:00:00`).toLocaleDateString(locale(lang), { weekday: 'short', day: 'numeric', month: 'short' });

function Ext({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
}

/** Official interactive map (live lift / slope status) – loads only when asked. */
function OfficialMap({ url, title, onClose, closeLabel }: { url: string; title: string; onClose: () => void; closeLabel: string }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden'; btn.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => { html.style.overflow = prev; window.removeEventListener('keydown', k); };
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[90] flex flex-col bg-deep">
      <div className="flex items-center justify-between gap-4 px-5 py-3 text-cream">
        <p className="min-w-0 truncate text-[14px] font-semibold">{title}</p>
        <div className="flex items-center gap-2">
          <Ext href={url} className="hidden min-h-11 items-center gap-2 rounded-full border border-cream/30 px-4 text-[13px] font-semibold sm:inline-flex"><Icon d={ICO.ext} size={15} w={1.6} />{new URL(url).host}</Ext>
          <button ref={btn} type="button" onClick={onClose} aria-label={closeLabel} className="grid h-11 w-11 place-items-center rounded-full bg-cream text-deep"><Icon d={['M6 6l12 12M18 6 6 18']} size={19} w={1.7} /></button>
        </div>
      </div>
      <iframe src={url} title={title} className="min-h-0 flex-1 border-0 bg-white" allow="fullscreen; geolocation" />
    </div>
  );
}

/* ================================================================== 1 · dashboard */
function Dashboard({ lang, season, t, resort, setResort, wx, onMap }: { lang: Lang; season: Season; t: MCopy; resort: ResortId; setResort: (r: ResortId) => void; wx: ConditionsResult; onMap: (url: string) => void }) {
  const r = resortById(resort), acc = r.access[season], d = wx.data[resort];
  const winter = season === 'winter';
  const val = (v: React.ReactNode) => (wx.state === 'loading' ? <span className="mx-shimmer inline-block h-7 w-16 rounded" /> : wx.state === 'error' || !d ? <span className="text-[14px] font-medium text-ink/45">—</span> : v);
  const mods: { k: string; icon: string[]; label: string; value: React.ReactNode; note?: string }[] = [
    { k: 'temp', icon: ICO.temp, label: t.temp, value: val(<>{Math.round(d?.temp ?? 0)}<span className="text-[.5em] text-ink/50">°C</span></>) },
    { k: 'sky', icon: ICO.sky, label: t.sky, value: val(<span className="text-[22px]">{d ? skyLabel(d.code, lang) : ''}</span>) },
    ...(winter ? [
      { k: 'snow', icon: ICO.snow, label: t.snow, value: val(<>{d?.snowCm}<span className="text-[.5em] text-ink/50"> cm</span></>) },
      { k: 'last', icon: ICO.flake, label: t.lastSnow, value: val(<span className="text-[22px]">{d?.lastSnow ? fmtDay(d.lastSnow, lang) : t.noSnowRecent}</span>), note: d ? `${t.newSnow}: ${d.newSnow7} cm` : undefined },
    ] : [
      { k: 'wind', icon: ICO.wind, label: t.wind, value: val(<>{Math.round(d?.wind ?? 0)}<span className="text-[.5em] text-ink/50"> km/h</span></>) },
      { k: 'alt', icon: ICO.slope, label: t.elevation, value: val(<>{d?.elevation.toLocaleString(locale(lang))}<span className="text-[.5em] text-ink/50"> m</span></>) },
    ]),
  ];
  return (
    <section id="mx-dash" aria-labelledby="mx-dash-title" className="scroll-mt-28 px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1360px]">
        <div className="mx-rev flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2 id="mx-dash-title" className="font-display font-medium italic leading-[1] text-pine" style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{t.dashTitle[season]}</h2>
          <div role="tablist" aria-label={t.destination} className="flex gap-2 rounded-full border border-pine/15 bg-white p-1.5">
            {RESORTS.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={resort === x.id} onClick={() => setResort(x.id)} className={`mx-seg min-h-11 rounded-full px-4 text-[14px] font-semibold sm:px-5 ${resort === x.id ? 'is-on' : ''}`}>{x.name}</button>
            ))}
          </div>
        </div>

        <div key={`${resort}-${season}`} className="mx-fade mt-10 grid gap-5 md:mt-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
          {/* visual panel */}
          <div className="relative min-h-[500px] overflow-hidden rounded-[22px] bg-deep text-cream md:min-h-[480px]">
            <img src={r.img[season]} alt={r.name} className="mx-zoom absolute inset-0 h-full w-full object-cover" />
            <span aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_88%,transparent),color-mix(in_srgb,var(--k-deep)_10%,transparent)_60%)]" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <p className="text-[11.5px] font-semibold uppercase tracking-[.3em] text-gold-light">{r.area[lang]}</p>
              <p className="mt-2 font-display text-[38px] leading-none md:text-[52px]">{r.name}</p>
              <ul className="mt-4 flex flex-wrap gap-2">{r.facts[season][lang].map((f) => <li key={f} className="rounded-full border border-cream/30 bg-black/15 px-3 py-1 text-[12.5px] backdrop-blur-sm">{f}</li>)}</ul>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Ext href={directionsUrl(acc.lat, acc.lon)} className="ph-primary inline-flex min-h-[48px] items-center gap-2.5 rounded-full px-5 text-[14.5px] font-semibold"><Icon d={ICO.car} size={17} w={1.6} />{t.route}</Ext>
                <span className="lnum text-[13px] text-cream/80">{acc.name[lang]} · {t.drive(acc.km, acc.min)}</span>
              </div>
            </div>
          </div>

          {/* modules */}
          <div className="flex min-w-0 flex-col gap-4">
            <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-pine/10 bg-pine/10">
              {mods.map((m) => (
                <li key={m.k} className="flex min-h-[132px] flex-col bg-white p-5">
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-ink/55"><span className="text-goldink"><Icon d={m.icon} size={17} w={1.5} /></span>{m.label}</span>
                  <span className="lnum mt-auto pt-3 font-display text-[40px] leading-none text-pine">{m.value}</span>
                  {m.note && <span className="mt-1.5 text-[12px] text-ink/55">{m.note}</span>}
                </li>
              ))}
              {winter && [{ k: 'l', icon: ICO.lift, label: t.lifts, href: r.links.lifts }, { k: 's', icon: ICO.slope, label: t.slopes, href: r.links.slopes }].map((m) => (
                <li key={m.k} className="flex min-h-[112px] flex-col bg-cream p-5">
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-ink/55"><span className="text-goldink"><Icon d={m.icon} size={17} w={1.5} /></span>{m.label}</span>
                  <Ext href={m.href} className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[14px] font-semibold text-pine underline decoration-gold underline-offset-4">{t.liveOfficial}<Icon d={ICO.ext} size={14} w={1.6} /></Ext>
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] leading-relaxed text-ink/55">
              {wx.state === 'error' ? t.error : wx.state === 'loading' ? t.loading : `${t.model} · ${d ? t.updated(fmtTime(d.time, lang)) : ''}`}
              {winter && <> · {t.statusNote}</>}
            </p>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={() => onMap(r.links.map[season])} className="btn-pine inline-flex min-h-[52px] flex-1 items-center justify-center gap-2.5 rounded-full px-5 text-[14.5px] font-semibold"><Icon d={ICO.mapI} size={17} w={1.6} />{winter ? t.openMap : t.openMapSummer}</button>
              <Ext href={r.links.report} className="pr-btn-ghost inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-semibold">{t.report}<Icon d={ICO.ext} size={14} w={1.6} /></Ext>
            </div>
            <a href={`#karte-${acc.mapId}`} className="inline-flex items-center gap-2 self-start text-[13px] font-semibold text-pine underline decoration-gold underline-offset-4"><Icon d={ICO.pin} size={15} w={1.6} />{t.showMap}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== 2 · webcams */
function CamImage({ cam, className = '' }: { cam: Webcam; className?: string }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [cam.id]);
  return bad ? <div className={`grid place-items-center bg-deep text-cream/60 ${className}`}><Icon d={ICO.cam} size={30} w={1.3} /></div>
    : <img src={cam.poster} alt={cam.name} loading="lazy" onError={() => setBad(true)} className={`object-cover ${className}`} />;
}

function Webcams({ lang, season, t, resort, cam, setCam }: { lang: Lang; season: Season; t: MCopy; resort: ResortId; cam: string; setCam: (id: string) => void }) {
  const c = WEBCAMS.find((x) => x.id === cam) ?? WEBCAMS[0];
  const [live, setLive] = useState(false);
  const [stamp, setStamp] = useState<string | null>(null);
  const [bad, setBad] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => { setLive(false); setBad(false); setStamp(null); }, [cam]);
  // refreshed still images: read the provider's Last-Modified (CORS-enabled) – never shown as "live"
  useEffect(() => {
    if (c.kind !== 'still') return;
    const ac = new AbortController();
    fetch(c.poster, { method: 'HEAD', signal: ac.signal }).then((r) => { const lm = r.headers.get('last-modified'); if (lm) setStamp(new Date(lm).toISOString()); }).catch(() => {});
    return () => ac.abort();
  }, [c]);
  const cams = [...WEBCAMS.filter((x) => x.resort === resort), ...WEBCAMS.filter((x) => x.resort !== resort)];
  const full = () => { const el = stage.current; if (el?.requestFullscreen) el.requestFullscreen().catch(() => {}); };
  return (
    <section id="mx-cams" aria-labelledby="mx-cams-title" className="scroll-mt-28 bg-deep px-5 py-20 text-cream sm:px-6 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1360px]">
        <header className="mx-rev max-w-[760px]">
          <h2 id="mx-cams-title" className="font-display font-medium italic leading-[1]" style={{ fontSize: 'clamp(34px, 4.6vw, 72px)' }}>{t.camTitle}</h2>
          <p className="mt-4 text-[16px] leading-relaxed text-cream/75 md:text-[18px]">{season === 'winter' ? t.camSub : t.camSubSummer}</p>
        </header>
        <div className="mt-10 grid gap-5 md:mt-14 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div ref={stage} className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-black sm:aspect-[16/10] md:aspect-[16/9]">
            {live && c.embed ? (
              <iframe key={c.id} src={c.embed} title={c.name} className="absolute inset-0 h-full w-full border-0" allow="fullscreen; gyroscope; accelerometer" allowFullScreen />
            ) : (
              <div key={c.id} className="mx-fade absolute inset-0">
                {bad ? <div className="grid h-full place-items-center text-cream/60">{t.camUnavailable}</div>
                  : <img src={c.poster} alt={c.name} onError={() => setBad(true)} className={`h-full w-full ${c.kind === 'panorama' ? 'object-cover' : 'object-cover'}`} />}
                <span aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,.7),transparent_45%)]" />
              </div>
            )}
            {!live && (
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between md:p-7">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[.26em] text-gold-light">{resortById(c.resort).name}</p>
                  <p className="mt-1 font-display text-[30px] leading-none md:text-[42px]">{c.name}</p>
                  <p className="mt-2 text-[12.5px] text-cream/75">{c.place} · {t.kind[c.kind]}{stamp ? ` · ${t.imgTime(fmtTime(stamp, lang))}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.embed && <button type="button" onClick={() => setLive(true)} className="ph-primary inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold">{t.open360}<Icon d={I.arrow} size={15} w={1.8} /></button>}
                  <Ext href={c.official} className="ph-secondary inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold">{t.official}<Icon d={ICO.ext} size={14} w={1.6} /></Ext>
                </div>
              </div>
            )}
            {live && <button type="button" onClick={full} aria-label={t.fullscreen} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"><Icon d={ICO.full} size={17} w={1.6} /></button>}
          </div>
          <ul className="rs-track -mx-5 flex snap-x gap-3 overflow-x-auto px-5 lg:mx-0 lg:max-h-[520px] lg:flex-col lg:overflow-y-auto lg:px-0" aria-label="Webcams">
            {cams.map((x) => (
              <li key={x.id} className="w-[62%] shrink-0 snap-start sm:w-[38%] lg:w-auto">
                <button type="button" onClick={() => setCam(x.id)} aria-pressed={x.id === c.id}
                  className={`mx-cam group flex w-full items-center gap-3 rounded-[16px] p-2 text-left ${x.id === c.id ? 'is-on' : ''}`}>
                  <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-[11px]"><CamImage cam={x} className="h-full w-full transition-transform duration-500 group-hover:scale-105" /></span>
                  <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{x.name}</span><span className="block truncate text-[12px] text-cream/60">{resortById(x.resort).name}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-5 text-[12px] text-cream/50">{t.source}: Panomax · feratel · {lang === 'de' ? 'Bilder der Betreiber, regelmäßig aktualisiert – kein Live-Video.' : 'operator images, refreshed regularly – not live video.'}</p>
      </div>
    </section>
  );
}

/* ================================================================== 3 · planner */
const PLAN_KEY = 'kitzalpen-mountain-plan';
function Planner({ lang, season, t, onCam, onMap }: { lang: Lang; season: Season; t: MCopy; onCam: (r: ResortId) => void; onMap: (url: string) => void }) {
  const winter = season === 'winter';
  const [step, setStep] = useState(0);
  const [p, setP] = useState<PlannerPreferences>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { setStep(0); setP({}); setSaved(false); }, [season]);
  const steps = winter ? t.steps : t.stepsSummer;
  const today = new Date().toISOString().slice(0, 10);
  const opts: { key: keyof PlannerPreferences; items: [string, string][] }[] = [
    { key: 'who', items: Object.entries(t.who) as [Who, string][] },
    { key: 'level', items: Object.entries(winter ? t.level : t.levelSummer) as [Level, string][] },
    { key: 'style', items: Object.entries(winter ? t.style : t.styleSummer) as [Style, string][] },
  ];
  const rec = useMemo(() => recommend(p, season), [p, season]);
  const r = resortById(rec.resort), acc = r.access[season];
  const pick = (k: keyof PlannerPreferences, v: string) => { setP((s) => ({ ...s, [k]: v })); setTimeout(() => setStep((s) => Math.min(s + 1, 4)), 180); };
  const summary = () => [
    `${t.result[season]} – KitzAlpen`, `${r.name}${p.date ? ` · ${t.on(fmtDay(p.date, lang))}` : ''}`, '',
    ...rec.reasons[lang].map((x) => `• ${x}`), '', `${t.start}: ${acc.name[lang]}`, `${t.route}: ${directionsUrl(acc.lat, acc.lon)}`, `${t.report}: ${r.links.report}`,
  ].join('\n');
  const save = () => { try { localStorage.setItem(PLAN_KEY, JSON.stringify({ p, season, resort: rec.resort, at: Date.now() })); setSaved(true); } catch { /* storage blocked */ } };
  const share = async () => { const text = summary(); if (navigator.share) { try { await navigator.share({ title: t.result[season], text }); } catch { /* cancelled */ } } else { await navigator.clipboard?.writeText(text).catch(() => {}); setSaved(true); } };
  const done = step === 4;
  return (
    <section id="mx-plan" aria-labelledby="mx-plan-title" className="scroll-mt-28 bg-soft px-5 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto grid max-w-[1360px] gap-10 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <header className="mx-rev lg:sticky lg:top-32 lg:self-start">
          <h2 id="mx-plan-title" className="font-display font-medium italic leading-[1] text-pine" style={{ fontSize: 'clamp(34px, 4.4vw, 68px)' }}>{t.planTitle[season]}</h2>
          <p className="mt-5 max-w-[42ch] text-[16.5px] leading-relaxed text-ink/70">{t.planSub}</p>
          <ol className="mt-8 flex flex-col gap-2" aria-label={steps.join(' · ')}>
            {steps.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 text-[14px] transition-colors ${i === step ? 'font-semibold text-pine' : i < step ? 'text-ink/70' : 'text-ink/35'}`}>
                <span className={`lnum grid h-7 w-7 place-items-center rounded-full border text-[12px] ${i < step ? 'border-pine bg-pine text-cream' : i === step ? 'border-pine' : 'border-ink/20'}`}>{i < step ? '✓' : i + 1}</span>{s}
              </li>
            ))}
          </ol>
        </header>
        <div className="min-w-0">
          <div key={`${season}-${step}`} className="mx-fade rounded-[24px] border border-pine/10 bg-cream p-6 md:p-9">
            {!done && <p className="lnum text-[12px] font-semibold uppercase tracking-[.26em] text-goldink">{step + 1} / 5 · {steps[step]}</p>}
            {step < 3 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {opts[step].items.map(([k, label]) => (
                  <button key={k} type="button" onClick={() => pick(opts[step].key, k)} aria-pressed={p[opts[step].key] === k}
                    className={`mx-opt flex min-h-[64px] items-center justify-between gap-3 rounded-[16px] px-5 text-left text-[16px] font-semibold ${p[opts[step].key] === k ? 'is-on' : ''}`}>
                    {label}<Icon d={I.arrow} size={17} w={1.7} />
                  </button>
                ))}
              </div>
            )}
            {step === 3 && (
              <div className="mt-5">
                <label className="block"><span className="mb-2 block text-[12px] font-semibold uppercase tracking-[.18em] text-ink/55">{t.date}</span>
                  <input type="date" min={today} value={p.date ?? ''} onChange={(e) => setP((s) => ({ ...s, date: e.target.value }))} className="c-input h-[56px] w-full rounded-[14px] border border-pine/15 bg-white px-4 text-[16px] outline-none focus:border-pine sm:max-w-[320px]" /></label>
                <p className="mt-3 text-[13px] text-ink/55">{t.dateNote}</p>
                <button type="button" onClick={() => setStep(4)} className="btn-pine mt-6 inline-flex min-h-[52px] items-center gap-2.5 rounded-full px-7 text-[15px] font-semibold">{t.next}<Icon d={I.arrow} size={16} w={1.8} /></button>
              </div>
            )}
            {done && (
              <article>
                <div className="relative -mx-6 -mt-6 overflow-hidden rounded-t-[24px] md:-mx-9 md:-mt-9">
                  <img src={r.img[season]} alt={r.name} className="aspect-[16/8] w-full object-cover" />
                  <span aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,rgba(10,20,15,.75),transparent_60%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-cream md:p-9">
                    <p className="text-[11.5px] font-semibold uppercase tracking-[.3em] text-gold-light">{t.result[season]}{p.date ? ` · ${t.on(fmtDay(p.date, lang))}` : ''}</p>
                    <p className="mt-1 font-display text-[36px] leading-none md:text-[48px]">{r.name}</p>
                  </div>
                </div>
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[.2em] text-ink/55">{t.why}</p>
                <ul className="mt-3 flex flex-col gap-2.5">{rec.reasons[lang].map((x) => <li key={x} className="flex gap-3 text-[15.5px] text-ink/85"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />{x}</li>)}</ul>
                {rec.caution && <p className="mt-4 rounded-[14px] bg-pine/[.06] px-4 py-3 text-[13.5px] text-pine">{rec.caution[lang]}</p>}
                <p className="mt-5 text-[14px] text-ink/70"><span className="font-semibold">{t.start}:</span> {acc.name[lang]} · <span className="lnum">{t.drive(acc.km, acc.min)}</span></p>
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  <Ext href={directionsUrl(acc.lat, acc.lon)} className="btn-pine inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"><Icon d={ICO.car} size={17} w={1.6} />{t.route}</Ext>
                  <button type="button" onClick={() => onMap(r.links.map[season])} className="pr-btn-ghost inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"><Icon d={ICO.mapI} size={16} w={1.6} />{winter ? t.pisteMap : t.summerMap}</button>
                  <button type="button" onClick={() => onCam(rec.resort)} className="pr-btn-ghost inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"><Icon d={ICO.cam} size={16} w={1.6} />{t.webcam}</button>
                  <Ext href={r.links.report} className="pr-btn-ghost inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-semibold">{t.report}<Icon d={ICO.ext} size={14} w={1.6} /></Ext>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-pine/10 pt-5 text-[13.5px] font-semibold text-pine">
                  <button type="button" onClick={save} className="inline-flex min-h-11 items-center gap-2"><Icon d={ICO.save} size={16} w={1.6} />{saved ? t.saved : t.save}</button>
                  <button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-2"><Icon d={ICO.share} size={16} w={1.6} />{t.share}</button>
                  <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2"><Icon d={ICO.print} size={16} w={1.6} />{t.print}</button>
                  <a href="#all-rooms" className="inline-flex min-h-11 items-center gap-2 text-goldink">{t.book} →</a>
                  <button type="button" onClick={() => { setStep(0); setP({}); setSaved(false); }} className="ml-auto inline-flex min-h-11 items-center text-ink/55">{t.restart}</button>
                </div>
              </article>
            )}
            {step > 0 && !done && <button type="button" onClick={() => setStep((s) => s - 1)} className="mt-6 inline-flex min-h-11 items-center gap-2 text-[13.5px] font-semibold text-ink/60"><span className="rotate-180"><Icon d={I.arrow} size={15} w={1.7} /></span>{t.back}</button>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== 4 · finder */
function Finder({ lang, season, t, onCam, onMap }: { lang: Lang; season: Season; t: MCopy; onCam: (r: ResortId) => void; onMap: (url: string) => void }) {
  const profiles = PROFILES[season];
  const [pid, setPid] = useState(profiles[0].id);
  useEffect(() => setPid(PROFILES[season][0].id), [season]);
  const prof = profiles.find((x) => x.id === pid) ?? profiles[0];
  const rec = recommend(prof.prefs, season), r = resortById(rec.resort), acc = r.access[season];
  return (
    <section id="mx-find" aria-labelledby="mx-find-title" className="relative isolate scroll-mt-28 overflow-hidden bg-deep px-5 py-20 text-cream sm:px-6 md:px-10 md:py-28 lg:px-14">
      <img key={`${season}-${r.id}`} src={r.img[season]} alt="" aria-hidden className="mx-fade absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_92%,transparent),color-mix(in_srgb,var(--k-deep)_55%,transparent))]" />
      <div className="mx-auto max-w-[1360px]">
        <header className="mx-rev max-w-[760px]">
          <h2 id="mx-find-title" className="font-display font-medium italic leading-[1]" style={{ fontSize: 'clamp(34px, 4.6vw, 72px)' }}>{t.findTitle[season]}</h2>
          <p className="mt-4 text-[16px] text-cream/75 md:text-[18px]">{t.findSub}</p>
        </header>
        <div className="mt-10 grid gap-6 md:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
          <div role="radiogroup" aria-label={t.findSub} className="grid grid-cols-2 gap-3">
            {profiles.map((x, i) => (
              <button key={x.id} type="button" role="radio" aria-checked={x.id === pid} onClick={() => setPid(x.id)}
                className={`mx-prof flex min-h-[132px] min-w-0 flex-col items-start justify-between rounded-[18px] p-4 text-left md:min-h-[160px] md:p-5 ${x.id === pid ? 'is-on' : ''}`}>
                <span className="lnum text-[12px] font-semibold text-gold-light">{String(i + 1).padStart(2, '0')}</span>
                <span><span className="block font-display text-[17px] uppercase leading-tight tracking-[.03em] min-[400px]:text-[19px] md:text-[26px] md:tracking-[.04em]">{x.title[lang]}</span><span className="mt-1 block text-[13px] text-cream/70">{x.text[lang]}</span></span>
              </button>
            ))}
          </div>
          <article key={`${season}-${pid}`} className="mx-fade overflow-hidden rounded-[22px] bg-cream text-ink">
            <img src={r.img[season]} alt={r.name} className="aspect-[16/8] w-full object-cover" />
            <div className="p-6 md:p-8">
              <p className="text-[11.5px] font-semibold uppercase tracking-[.26em] text-goldink">{r.area[lang]}</p>
              <p className="mt-1 font-display text-[32px] font-medium italic leading-tight text-pine md:text-[40px]">{r.name}</p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[.2em] text-ink/55">{t.match}</p>
              <ul className="mt-2 flex flex-col gap-2">{rec.reasons[lang].map((x) => <li key={x} className="flex gap-3 text-[15px] text-ink/80"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />{x}</li>)}</ul>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <button type="button" onClick={() => onMap(r.links.map[season])} className="btn-pine inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold"><Icon d={ICO.mapI} size={16} w={1.6} />{season === 'winter' ? t.pisteMap : t.summerMap}</button>
                <button type="button" onClick={() => onCam(rec.resort)} className="pr-btn-ghost inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold"><Icon d={ICO.cam} size={16} w={1.6} />{t.webcam}</button>
                <Ext href={directionsUrl(acc.lat, acc.lon)} className="pr-btn-ghost inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 text-[14px] font-semibold"><Icon d={ICO.car} size={16} w={1.6} />{t.route}</Ext>
              </div>
              <p className="mt-5 text-[12.5px] text-ink/55">{t.changes} <Ext href={r.links.report} className="font-semibold text-pine underline decoration-gold underline-offset-4">{t.report}</Ext></p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== page */
export function MountainPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { season } = useSeason();
  const t = MCOPY[lang];
  const [resort, setResort] = useState<ResortId>('kitzski');
  const [cam, setCam] = useState(WEBCAMS[0].id);
  const [wx, setWx] = useState<ConditionsResult>({ state: 'loading', data: {}, source: '' });
  const [official, setOfficial] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    loadConditions(ac.signal).then(setWx).catch(() => { if (!ac.signal.aborted) setWx({ state: 'error', data: {}, source: '' }); });
    return () => ac.abort();
  }, []);
  // deep links from the homepage: #mountain-cams / -plan / -find / -dash
  useEffect(() => {
    const m = /^#mountain-(dash|cams|plan|find)$/.exec(window.location.hash);
    if (m) window.setTimeout(() => document.getElementById(`mx-${m[1]}`)?.scrollIntoView({ behavior: 'auto', block: 'start' }), 250);
  }, []);
  // a chosen resort also picks its first webcam
  const pickResort = (r: ResortId) => { setResort(r); setCam(WEBCAMS.find((x) => x.resort === r)!.id); };
  const toCam = (r: ResortId) => { pickResort(r); document.getElementById('mx-cams')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-mx-hero'), { scale: 1.06 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo(q('.js-mx-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: 'power4.out' }, 0.3)
      .fromTo(q('.js-mx-in'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.7);
    q('.mx-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
  }, { scope: root, dependencies: [reduced] });

  const r = resortById(resort);
  const jump = season === 'winter' ? t.jump : t.jumpSummer;
  return (
    <div ref={root} className="bg-cream text-ink">
      {/* hero */}
      <section id="top" aria-labelledby="mx-title" className="relative isolate flex min-h-[86svh] items-end overflow-hidden bg-deep text-cream">
        <div className="absolute inset-0 -z-10">
          {(['winter', 'summer'] as Season[]).map((s) => (
            <img key={s} src={s === 'winter' ? `${import.meta.env.BASE_URL}images/winter/glockner.webp` : `${import.meta.env.BASE_URL}images/experience/summer-1920.webp`} alt="" aria-hidden
              className="js-mx-hero absolute inset-0 h-full w-full object-cover transition-opacity duration-500" style={{ opacity: s === season ? 1 : 0 }} />
          ))}
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_92%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_55%,transparent)_45%,color-mix(in_srgb,var(--k-deep)_25%,transparent)_100%)]" />
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-40 sm:px-6 md:px-10 md:pb-16 lg:px-14">
          <p className="js-mx-in text-[11.5px] font-semibold uppercase tracking-[.34em] text-gold-light md:text-[13px]">{t.guide} · {season === 'winter' ? 'Winter' : (lang === 'de' ? 'Sommer' : 'Summer')}</p>
          <h1 id="mx-title" key={season} className="mt-4 max-w-[900px] font-display font-normal leading-[1.02] tracking-[-0.012em] md:mt-6" style={{ fontSize: 'clamp(42px, 6vw, 100px)' }}>
            <span className="block overflow-hidden pb-[0.1em]"><span className="js-mx-line mx-fade block italic">{t.title[season]}</span></span>
          </h1>
          <p className="js-mx-in mt-5 max-w-[560px] text-[16px] leading-relaxed text-cream/85 md:text-[18px]">{t.sub[season]}</p>
          <nav aria-label={t.guide} className="js-mx-in mt-9 flex flex-wrap gap-2">
            {['mx-dash', 'mx-cams', 'mx-plan', 'mx-find'].map((id, i) => (
              <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }}
                className="c-quick inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold"><span className="lnum text-gold-light">{String(i + 1).padStart(2, '0')}</span>{jump[i]}</a>
            ))}
          </nav>
        </div>
      </section>

      <Dashboard lang={lang} season={season} t={t} resort={resort} setResort={pickResort} wx={wx} onMap={setOfficial} />
      <Webcams lang={lang} season={season} t={t} resort={resort} cam={cam} setCam={setCam} />
      <Planner lang={lang} season={season} t={t} onCam={toCam} onMap={setOfficial} />
      <Finder lang={lang} season={season} t={t} onCam={toCam} onMap={setOfficial} />

      {/* stay */}
      <section aria-label={t.stayTitle} className="px-5 pb-[calc(110px+env(safe-area-inset-bottom,0px))] pt-20 sm:px-6 md:px-10 md:pb-28 lg:px-14">
        <div className="mx-rev mx-auto flex max-w-[1360px] flex-col items-start gap-6 border-t border-pine/15 pt-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-[34px] font-medium italic leading-tight text-pine md:text-[48px]">{t.stayTitle}</p>
            <p className="mt-2 text-[16px] text-ink/70">{t.stayText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="#all-rooms" className="pr-btn-ghost inline-flex min-h-[52px] items-center rounded-full px-6 text-[15px] font-semibold">{t.rooms}</a>
            <Ext href={BOOKING_ENGINE} className="btn-pine inline-flex min-h-[52px] items-center gap-2 rounded-full px-6 text-[15px] font-semibold">{t.book}<Icon d={I.arrow} size={16} w={1.8} /></Ext>
          </div>
        </div>
      </section>

      {official && <OfficialMap url={official} title={`${(RESORTS.find((x) => Object.values(x.links.map).includes(official)) ?? r).name} · ${season === 'winter' ? t.openMap : t.openMapSummer}`} onClose={() => setOfficial(null)} closeLabel={t.closeMap} />}
    </div>
  );
}
