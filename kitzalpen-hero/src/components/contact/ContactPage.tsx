import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Lang, Season } from '../../content/hero';
import { CONTACT, CONTACT_COPY } from '../../content/contactPage';
import { BOOKING_ENGINE } from '../BookingBar';
import { useFinePointer, useReducedMotion } from '../../lib/hooks';
import { useSeason } from '../../lib/season';
import { Icon } from '../pension/PensionRooms';

gsap.registerPlugin(ScrollTrigger, useGSAP);
const IMG = `${import.meta.env.BASE_URL}images/hero/`;
const ICO = {
  phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z'],
  mail: ['M3.5 6h17v12h-17Z', 'm4 7 8 6 8-6'],
  wa: ['M4 20l1.3-4A8 8 0 1 1 8 18.7Z', 'M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2Z'],
  pin: ['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z', 'M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  route: ['M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M8 17h6a3 3 0 0 0 0-6H10a3 3 0 0 1 0-6h6'],
  cal: ['M4 6.5h16V20H4Z', 'M4 10.5h16M8.5 4v4M15.5 4v4'],
  fb: ['M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8Z'],
};

function useReception() {
  return useMemo(() => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const m = Number(p.find((x) => x.type === 'hour')?.value ?? 0) * 60 + Number(p.find((x) => x.type === 'minute')?.value ?? 0);
    return m >= CONTACT.reception[0] && m < CONTACT.reception[1];
  }, []);
}

/** Contact page – seasonal photo hero, quick actions, the enquiry form next to the contact card, the map. */
export function ContactPage({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const { season } = useSeason();
  const t = CONTACT_COPY[lang];
  const open = useReception();
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState({ name: '', email: '', phone: '', room: '', arrive: '', depart: '', guests: '2', msg: '' });
  const [err, setErr] = useState('');
  const [map, setMap] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  useGSAP(() => {
    if (reduced) return;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.js-c-hero'), { scale: 1.06 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo(q('.js-c-eyebrow'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.25)
      .fromTo(q('.js-c-line'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.1, ease: 'power4.out' }, 0.35)
      .fromTo(q('.js-c-in'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.8)
      .fromTo(q('.js-c-card'), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 0.9);
    if (fine) gsap.to(q('.js-c-par'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: q('#top')[0], start: 'top top', end: 'bottom top', scrub: 0.6 } });
    q('.js-c-rev').forEach((el) => gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
  }, { scope: root, dependencies: [reduced, fine] });

  const body = () => {
    const f = t.f;
    return [
      `${f.name}: ${v.name}`, `${f.email}: ${v.email}`, `${f.phone}: ${v.phone}`,
      `${f.room}: ${v.room || f.any}`, `${f.arrive}: ${v.arrive}`, `${f.depart}: ${v.depart}`, `${f.guests}: ${v.guests}`,
      '', v.msg,
    ].join('\n');
  };
  const valid = () => {
    if (!v.name.trim() || !v.email.trim() || !v.phone.trim() || !v.arrive || !v.depart) { setErr(t.required); return false; }
    if (v.depart <= v.arrive) { setErr(t.dateErr); return false; }
    setErr(''); return true;
  };
  const sendMail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid()) return;
    window.location.href = `mailto:${CONTACT.mail}?subject=${encodeURIComponent(`${t.subject} – ${v.name}`)}&body=${encodeURIComponent(body())}`;
  };
  const sendWa = () => {
    if (!valid()) return;
    window.open(`https://wa.me/${CONTACT.wa}?text=${encodeURIComponent(`${t.subject}\n\n${body()}`)}`, '_blank', 'noopener');
  };

  const input = 'c-input w-full rounded-[14px] border border-pine/15 bg-white px-4 text-[15.5px] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-pine';
  const label = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[.18em] text-ink/55';
  const quick = [
    { k: 'phone', href: `tel:${CONTACT.tel}`, label: t.call, sub: CONTACT.telLabel },
    { k: 'wa', href: `https://wa.me/${CONTACT.wa}`, label: t.whatsapp, sub: lang === 'de' ? 'Schnell & direkt' : 'Quick & direct', ext: true },
    { k: 'mail', href: `mailto:${CONTACT.mail}`, label: t.write, sub: CONTACT.mail },
  ];

  return (
    <div ref={root} className="bg-cream text-ink">
      {/* hero */}
      <section id="top" aria-labelledby="c-title" className="relative isolate overflow-hidden bg-deep pb-40 text-cream md:pb-48">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="js-c-par absolute inset-0">
            {(['winter', 'summer'] as Season[]).map((s) => (
              <img key={s} src={`${IMG}${s}-d-${s === "winter" ? 1672 : 1671}.webp`} alt="" aria-hidden className="js-c-hero absolute inset-0 h-full w-full object-cover object-[65%_55%] transition-opacity duration-1000" style={{ opacity: s === season ? 1 : 0 }} />
            ))}
          </div>
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--k-deep)_95%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_70%,transparent)_40%,color-mix(in_srgb,var(--k-deep)_30%,transparent)_100%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--k-deep)_85%,transparent)_0%,color-mix(in_srgb,var(--k-deep)_45%,transparent)_45%,color-mix(in_srgb,var(--k-deep)_25%,transparent)_100%)]" />
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-5 pt-40 sm:px-6 md:px-10 md:pt-48 lg:px-14">
          <div className="max-w-[820px]">
            <p className="js-c-eyebrow text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.eyebrow}</p>
            <h1 id="c-title" className="mt-4 font-display font-normal leading-[1.02] tracking-[-0.012em] [text-shadow:0_2px_28px_rgba(0,0,0,.3)] md:mt-6" style={{ fontSize: 'clamp(40px, 5.4vw, 88px)' }}>
              <span className="block overflow-hidden pb-[0.06em]"><span className="js-c-line block">{t.title[0]}</span></span>
              <span className="block overflow-hidden pb-[0.12em]"><span className="js-c-line block italic text-gold-light">{t.title[1]}</span></span>
            </h1>
            <p className="js-c-in mt-5 max-w-[560px] text-[16px] leading-relaxed text-cream/90 md:text-[18px]">{t.sub}</p>
          </div>
          <ul className="mt-9 grid gap-3 sm:grid-cols-3 md:max-w-[880px]">
            {quick.map((q) => (
              <li key={q.k} className="js-c-in">
                <a href={q.href} {...(q.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="c-quick group flex min-h-[64px] items-center gap-3.5 rounded-[18px] px-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream/15 text-gold-light"><Icon d={ICO[q.k as keyof typeof ICO]} size={19} w={1.5} /></span>
                  <span className="min-w-0"><span className="block text-[15px] font-semibold">{q.label}</span><span className="block truncate text-[12.5px] text-cream/70">{q.sub}</span></span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* form + info, overlapping the hero */}
      <section aria-label={t.formTitle} className="relative z-10 -mt-28 px-4 sm:px-6 md:-mt-32 md:px-10 lg:px-14">
        <div className="mx-auto grid max-w-[1360px] gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-6">
          <form onSubmit={sendMail} noValidate className="js-c-card rounded-[26px] border border-pine/10 bg-cream p-6 shadow-[0_40px_80px_-45px_rgba(10,20,15,.6)] md:p-10" aria-describedby="c-note">
            <p className="text-[12px] font-semibold uppercase tracking-[.34em] text-ink/60">{t.formEyebrow}</p>
            <h2 className="mt-2 font-display text-[34px] font-medium italic leading-tight text-pine md:text-[44px]">{t.formTitle}</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className={label}>{t.f.name} *</span><input required autoComplete="name" value={v.name} onChange={set('name')} className={`${input} h-[52px]`} /></label>
              <label><span className={label}>{t.f.email} *</span><input required type="email" autoComplete="email" value={v.email} onChange={set('email')} className={`${input} h-[52px]`} /></label>
              <label><span className={label}>{t.f.phone} *</span><input required type="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} className={`${input} h-[52px]`} /></label>
              <label><span className={label}>{t.f.arrive} *</span><input required type="date" min={today} value={v.arrive} onChange={set('arrive')} className={`${input} h-[52px]`} /></label>
              <label><span className={label}>{t.f.depart} *</span><input required type="date" min={v.arrive || today} value={v.depart} onChange={set('depart')} className={`${input} h-[52px]`} /></label>
              <label><span className={label}>{t.f.room}</span>
                <select value={v.room} onChange={set('room')} className={`${input} h-[52px] appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[right_16px_center] bg-no-repeat pr-10`}>
                  <option value="">{t.f.any}</option>{t.rooms.map((r) => <option key={r}>{r}</option>)}
                </select></label>
              <label><span className={label}>{t.f.guests}</span><input type="number" min={1} max={60} value={v.guests} onChange={set('guests')} className={`${input} h-[52px]`} /></label>
              <label className="sm:col-span-2"><span className={label}>{t.f.msg}</span><textarea rows={4} value={v.msg} onChange={set('msg')} placeholder={t.f.msgPh} className={`${input} resize-y py-3`} /></label>
            </div>
            {err && <p role="alert" className="mt-4 rounded-[12px] bg-[#e07a5f]/10 px-4 py-3 text-[14px] font-medium text-[#9c3f25]">{err}</p>}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="btn-pine inline-flex min-h-[54px] flex-1 items-center justify-center gap-3 rounded-full px-7 text-[15.5px] font-semibold"><Icon d={ICO.mail} size={18} w={1.6} />{t.sendMail}</button>
              <button type="button" onClick={sendWa} className="c-wa inline-flex min-h-[54px] flex-1 items-center justify-center gap-3 rounded-full px-7 text-[15.5px] font-semibold"><Icon d={ICO.wa} size={18} w={1.6} />{t.sendWa}</button>
            </div>
            <p id="c-note" className="mt-3 text-[12.5px] text-ink/50">{t.howNote}</p>
          </form>

          <aside className="js-c-card flex flex-col rounded-[26px] bg-pine p-6 text-cream md:p-10">
            <p className="text-[12px] font-semibold uppercase tracking-[.34em] text-cream/70">{t.infoTitle}</p>
            <p className="mt-2 font-display text-[30px] font-medium italic leading-tight md:text-[36px]">Kitzbühel Alpen Pension</p>
            <ul className="mt-6 flex flex-col divide-y divide-cream/15 border-y border-cream/15">
              <li className="flex gap-4 py-4"><span className="text-gold-light"><Icon d={ICO.pin} size={20} w={1.5} /></span><address className="not-italic text-[15px] leading-relaxed">{CONTACT.address.map((l) => <span key={l} className="block">{l}</span>)}</address></li>
              <li className="flex items-center gap-4 py-4"><span className="text-gold-light"><Icon d={ICO.phone} size={20} w={1.5} /></span><a href={`tel:${CONTACT.tel}`} className="lnum text-[15px] font-semibold hover:text-gold-light">{CONTACT.telLabel}</a></li>
              <li className="flex items-center gap-4 py-4"><span className="text-gold-light"><Icon d={ICO.mail} size={20} w={1.5} /></span><a href={`mailto:${CONTACT.mail}`} className="min-w-0 truncate text-[15px] font-semibold hover:text-gold-light">{CONTACT.mail}</a></li>
              <li className="flex items-start gap-4 py-4"><span className="text-gold-light"><Icon d={ICO.clock} size={20} w={1.5} /></span>
                <span className="text-[15px]"><span className="block">{t.reception} · <span className="lnum font-semibold">{t.hours}</span></span>
                  <span className="mt-1.5 inline-flex items-center gap-2 text-[13px] text-cream/80"><span className={`h-2 w-2 rounded-full ${open ? 'bg-[#7fd18b] shadow-[0_0_8px_#7fd18b]' : 'bg-gold-light'}`} />{open ? t.openNow : t.closedNow}</span></span></li>
            </ul>
            <div className="mt-6 flex flex-col gap-3">
              <a href={CONTACT.route} target="_blank" rel="noopener noreferrer" className="ph-primary inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full px-6 text-[15px] font-semibold"><Icon d={ICO.route} size={18} w={1.6} />{t.route}</a>
              <a href="#arrival" className="ph-secondary inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-semibold">{lang === 'de' ? 'Anreise & Mobilität' : 'Arrival & mobility'}</a>
              <a href={BOOKING_ENGINE} target="_blank" rel="noopener noreferrer" className="ph-secondary inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full px-6 text-[15px] font-semibold"><Icon d={ICO.cal} size={18} w={1.6} />{t.book}</a>
            </div>
            <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="mt-auto inline-flex items-center gap-2 self-start pt-6 text-[13px] font-semibold text-cream/75 hover:text-cream"><Icon d={ICO.fb} size={18} w={1.5} />Facebook</a>
          </aside>
        </div>
      </section>

      {/* map */}
      <section aria-label={t.maps} className="px-4 pb-[calc(110px+env(safe-area-inset-bottom,0px))] pt-16 sm:px-6 md:px-10 md:pb-28 md:pt-20 lg:px-14">
        <div className="js-c-rev relative mx-auto h-[420px] max-w-[1360px] overflow-hidden rounded-[26px] bg-deep md:h-[480px]">
          {map ? (
            <iframe title={t.maps} src={CONTACT.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full w-full border-0" />
          ) : (
            <>
              <img src={`${import.meta.env.BASE_URL}map/satellite.jpg`} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70" />
              <span aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,transparent,color-mix(in_srgb,var(--k-deep)_80%,transparent))]" />
              <span aria-hidden className="c-pin absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-full place-items-center rounded-full bg-gold-light text-deep shadow-[0_10px_30px_rgba(0,0,0,.4)]"><Icon d={ICO.pin} size={26} w={1.8} /></span>
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-6 text-center text-cream md:p-8">
                <p className="font-display text-[26px] italic">Reitlehen 42 · Hollersbach</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => setMap(true)} className="ph-primary inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 text-[14.5px] font-semibold">{t.mapLoad}</button>
                  <a href={CONTACT.maps} target="_blank" rel="noopener noreferrer" className="ph-secondary inline-flex min-h-[48px] items-center rounded-full px-6 text-[14.5px] font-semibold">{t.maps} ↗</a>
                </div>
                <p className="text-[12px] text-cream/60">{t.mapNote}</p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
