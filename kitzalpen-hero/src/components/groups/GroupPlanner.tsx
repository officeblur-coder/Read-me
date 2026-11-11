import { useMemo, useState } from 'react';
import type { Lang } from '../../content/hero';
import { GROUP_CONTACT, PLANNER_COPY } from '../../content/groupsPage';
import { ROOMS } from '../../content/rooms';
import { Icon, I } from '../pension/PensionRooms';
import { locale } from '../../lib/i18n';

const ICO = {
  mail: ['M3.5 6h17v12h-17Z', 'm4 7 8 6 8-6'],
  wa: ['M4 20l1.3-4A8 8 0 1 1 8 18.7Z', 'M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2Z'],
  minus: ['M6 12h12'], plus: ['M6 12h12M12 6v12'],
  tag: ['M3 12V4h8l9 9-8 8Z', 'M7.5 8.5h.01'],
};
type Stay = 'pension' | 'chalet' | 'both' | 'help';
const PENSION_CAP = ROOMS.reduce((s, r) => s + r.count * r.guests, 0);
const PENSION_ROOMS = ROOMS.reduce((s, r) => s + r.count, 0);
const CHALET_CAP = 4;
const CAP: Record<Stay, number> = { pension: PENSION_CAP, chalet: CHALET_CAP, both: PENSION_CAP + CHALET_CAP, help: PENSION_CAP + CHALET_CAP };
const WA = GROUP_CONTACT.wa.replace(/\D/g, '');

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (s: string, lang: Lang) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString(locale(lang), { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Group Stay Planner – builds a structured, non-binding enquiry and sends it by email or WhatsApp. */
export function GroupPlanner({ lang }: { lang: Lang }) {
  const t = PLANNER_COPY[lang];
  const today = iso(new Date());
  const [v, setV] = useState({ arrive: '', depart: '', adults: 8, children: 0, rooms: 0, type: 0, stay: 'pension' as Stay, board: 1, name: '', email: '', phone: '', req: '' });
  const [acts, setActs] = useState<number[]>([]);
  const [extras, setExtras] = useState<number[]>([]);
  const [err, setErr] = useState('');
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => { setV((s) => ({ ...s, [k]: x })); setErr(''); };
  const toggle = (arr: number[], f: (a: number[]) => void, i: number) => f(arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i]);

  const guests = v.adults + v.children;
  const nights = useMemo(() => {
    if (!v.arrive || !v.depart) return 0;
    return Math.round((Date.parse(v.depart) - Date.parse(v.arrive)) / 864e5);
  }, [v.arrive, v.depart]);
  const cap = CAP[v.stay];
  const over = guests > cap;
  const pct = Math.min(100, Math.round((guests / cap) * 100));

  const body = () => {
    const L = (k: string, x: string | number) => `${k}: ${x === '' ? t.none : x}`;
    return [
      L(t.arrive, fmt(v.arrive, lang)), L(t.depart, fmt(v.depart, lang)) + (nights > 0 ? ` (${t.nights(nights)})` : ''),
      L(t.adults, v.adults), L(t.children, v.children), L(t.rooms, v.rooms || t.roomsAuto),
      L(t.type, t.types[v.type]), L(t.stay, t.stays[v.stay]), L(t.board, t.boards[v.board]),
      L(t.acts, acts.map((i) => t.actsList[i]).join(', ')), L(t.extras, extras.map((i) => t.extrasList[i]).join(', ')),
      L(t.req, v.req.trim()), '', L(t.name, v.name.trim()), L(t.email, v.email.trim()), L(t.phone, v.phone.trim()),
    ].join('\n');
  };
  const valid = () => {
    if (!v.arrive || !v.depart || !v.name.trim()) { setErr(t.need); return false; }
    if (nights <= 0) { setErr(t.badDates); return false; }
    return true;
  };
  const sendMail = () => { if (valid()) window.location.href = `mailto:${GROUP_CONTACT.mail}?subject=${encodeURIComponent(`${t.subject} – ${v.name.trim()} (${guests})`)}&body=${encodeURIComponent(body())}`; };
  const sendWa = () => { if (valid()) window.open(`https://wa.me/${WA}?text=${encodeURIComponent(`${t.subject}\n\n${body()}`)}`, '_blank', 'noopener'); };

  const input = 'c-input w-full min-h-[52px] rounded-[14px] border border-pine/15 bg-white px-4 text-[15.5px] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-pine';
  const lab = 'mb-2 block text-[12px] font-semibold uppercase tracking-[.16em] text-ink/60';
  const step = (n: number) => (
    <p className="mb-4 flex items-center gap-3 font-display text-[22px] italic text-pine md:text-[24px]">
      <span className="lnum grid h-8 w-8 place-items-center rounded-full bg-pine font-sans text-[13px] font-semibold not-italic text-cream">{n + 1}</span>{t.steps[n]}
    </p>
  );
  const counter = (k: 'adults' | 'children' | 'rooms', label: string, min: number, max: number, auto?: string) => (
    <div>
      <span className={lab}>{label}</span>
      <div className="flex min-h-[52px] items-center justify-between rounded-[14px] border border-pine/15 bg-white px-1.5">
        <button type="button" aria-label={`${label} −`} disabled={v[k] <= min} onClick={() => set(k, v[k] - 1)} className="gp-step grid h-11 w-11 place-items-center rounded-full"><Icon d={ICO.minus} size={16} w={2} /></button>
        <output aria-live="polite" className="lnum text-[17px] font-semibold">{auto && v[k] === 0 ? <span className="text-[13px] font-medium text-ink/55">{auto}</span> : v[k]}</output>
        <button type="button" aria-label={`${label} +`} disabled={v[k] >= max} onClick={() => set(k, v[k] + 1)} className="gp-step grid h-11 w-11 place-items-center rounded-full"><Icon d={ICO.plus} size={16} w={2} /></button>
      </div>
    </div>
  );
  const chip = (on: boolean, label: string, onClick: () => void, key: string) => (
    <button key={key} type="button" aria-pressed={on} onClick={onClick} className={`gp-chip inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-semibold ${on ? 'is-on' : ''}`}>{label}</button>
  );

  return (
    <section id="g-planner" aria-labelledby="gp-title" className="scroll-mt-28 bg-soft px-4 py-20 sm:px-6 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[1360px]">
        <header className="js-g-rev max-w-[820px]">
          <p className="flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[.36em] text-ink/75 md:text-[13px]"><span aria-hidden className="h-px w-8 bg-ink/40 md:w-12" />{t.eyebrow}</p>
          <h2 id="gp-title" className="mt-4 font-display font-medium italic leading-[1.02] text-pine md:mt-5" style={{ fontSize: 'clamp(34px, 4.2vw, 64px)' }}>{t.title}</h2>
          <p className="mt-4 max-w-[56ch] text-[16.5px] leading-relaxed text-ink/75">{t.text}</p>
        </header>

        <div className="mt-10 grid gap-6 md:mt-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          <form onSubmit={(e) => { e.preventDefault(); sendMail(); }} noValidate className="js-g-rev min-w-0 space-y-10 rounded-[26px] border border-pine/10 bg-cream p-5 sm:p-8 md:p-10">
            <fieldset>
              <legend className="contents">{step(0)}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className={lab}>{t.arrive}</span><input type="date" min={today} value={v.arrive} onChange={(e) => set('arrive', e.target.value)} className={input} required /></label>
                <label><span className={lab}>{t.depart}</span><input type="date" min={v.arrive || today} value={v.depart} onChange={(e) => set('depart', e.target.value)} className={input} required /></label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="contents">{step(1)}</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                {counter('adults', t.adults, 1, 99)}
                {counter('children', t.children, 0, 60)}
                {counter('rooms', t.rooms, 0, PENSION_ROOMS + 1, t.roomsAuto)}
              </div>
              <label className="mt-4 block"><span className={lab}>{t.type}</span>
                <select value={v.type} onChange={(e) => set('type', Number(e.target.value))} className={input}>{t.types.map((x, i) => <option key={x} value={i}>{x}</option>)}</select>
              </label>
            </fieldset>

            <fieldset>
              <legend className="contents">{step(2)}</legend>
              <div role="radiogroup" aria-label={t.stay} className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {(Object.keys(t.stays) as Stay[]).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={v.stay === k} onClick={() => set('stay', k)} className={`gp-card flex min-h-[92px] flex-col items-start justify-between rounded-[16px] p-4 text-left ${v.stay === k ? 'is-on' : ''}`}>
                    <span className="font-display text-[21px] italic leading-none">{t.stays[k]}</span>
                    <span className="text-[12.5px] leading-snug opacity-75">{t.stayHint[k]}</span>
                  </button>
                ))}
              </div>
              <p className={`${lab} mt-6`}>{t.board}</p>
              <div className="flex flex-wrap gap-2">{t.boards.map((x, i) => chip(v.board === i, x, () => set('board', i), x))}</div>
            </fieldset>

            <fieldset>
              <legend className="contents">{step(3)}</legend>
              <p className={lab}>{t.acts}</p>
              <div className="flex flex-wrap gap-2">{t.actsList.map((x, i) => chip(acts.includes(i), x, () => toggle(acts, setActs, i), x))}</div>
              <p className={`${lab} mt-6`}>{t.extras}</p>
              <div className="flex flex-wrap gap-2">{t.extrasList.map((x, i) => chip(extras.includes(i), x, () => toggle(extras, setExtras, i), x))}</div>
              <label className="mt-6 block"><span className={lab}>{t.req}</span>
                <textarea rows={3} value={v.req} onChange={(e) => set('req', e.target.value)} placeholder={t.reqPh} className={`${input} py-3`} />
              </label>
            </fieldset>

            <fieldset>
              <legend className="contents">{step(4)}</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <label><span className={lab}>{t.name}</span><input value={v.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" className={input} required /></label>
                <label><span className={lab}>{t.email}</span><input type="email" value={v.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" className={input} /></label>
                <label><span className={lab}>{t.phone}</span><input type="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" className={input} /></label>
              </div>
            </fieldset>
          </form>

          {/* live summary */}
          <aside aria-labelledby="gp-sum" className="js-g-rev lg:sticky lg:top-[calc(var(--wb-h)+var(--ob-h)+96px)] lg:self-start">
            <div className="overflow-hidden rounded-[26px] bg-pine text-cream shadow-[0_40px_80px_-50px_rgba(10,30,20,.8)]">
              <div className="p-6 md:p-8">
                <p id="gp-sum" className="text-[12px] font-semibold uppercase tracking-[.3em] text-gold-light">{t.summary}</p>
                <p className="mt-3 font-display text-[34px] italic leading-tight md:text-[40px]">{t.guests(guests)}{nights > 0 && <span className="text-cream/70"> · {t.nights(nights)}</span>}</p>
                <p className="mt-1 text-[14.5px] text-cream/75">{v.arrive && v.depart && nights > 0 ? `${fmt(v.arrive, lang)} – ${fmt(v.depart, lang)}` : `${t.arrive} – ${t.depart}`}</p>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-cream/15 pt-5 text-[14px]">
                  <dt className="text-cream/60">{t.stay}</dt><dd className="text-right font-semibold">{t.stays[v.stay]}</dd>
                  <dt className="text-cream/60">{t.type}</dt><dd className="text-right font-semibold">{t.types[v.type]}</dd>
                  <dt className="text-cream/60">{t.board}</dt><dd className="text-right font-semibold">{t.boards[v.board]}</dd>
                  {acts.length > 0 && <><dt className="text-cream/60">{t.acts}</dt><dd className="text-right font-semibold">{acts.length}</dd></>}
                </dl>
                <div className="mt-6">
                  <div className="flex items-baseline justify-between text-[12.5px]"><span className="uppercase tracking-[.16em] text-cream/60">{t.cap}</span><span className="lnum font-semibold">{t.capOf(guests, cap)}</span></div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream/15" role="progressbar" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={guests} aria-label={t.cap}>
                    <span className={`gp-bar block h-full rounded-full ${over ? 'is-over' : ''}`} style={{ width: `${pct}%` }} />
                  </div>
                  {over && <p role="status" className="mt-3 rounded-[12px] bg-[color-mix(in_srgb,#e2a35a_22%,transparent)] p-3 text-[13.5px] leading-snug">{v.stay === 'both' || v.stay === 'help' ? t.overAll : t.over(cap)}</p>}
                  {v.rooms > PENSION_ROOMS && <p className="mt-2 text-[13px] text-cream/75">{t.roomsOver}</p>}
                </div>
                <p className="mt-5 flex items-start gap-3 rounded-[14px] border border-gold-light/40 p-3.5 text-[13.5px] leading-snug text-cream/90"><span className="mt-0.5 text-gold-light"><Icon d={ICO.tag} size={18} w={1.6} /></span>{t.discount}</p>
              </div>
              <div className="space-y-3 bg-deep/40 p-6 md:p-8">
                {err && <p role="alert" className="rounded-[12px] bg-cream/10 p-3 text-[13.5px] text-gold-light">{err}</p>}
                <button type="button" onClick={sendMail} className="ph-primary inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full px-6 text-[15.5px] font-semibold"><Icon d={ICO.mail} size={18} w={1.6} />{t.sendMail}<Icon d={I.arrow} size={16} w={1.8} /></button>
                <button type="button" onClick={sendWa} className="gp-wa inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full px-6 text-[15.5px] font-semibold"><Icon d={ICO.wa} size={18} w={1.6} />{t.sendWa}</button>
                <p className="pt-1 text-center text-[12.5px] leading-snug text-cream/60">{t.disclaimer}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
