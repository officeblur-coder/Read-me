import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Copy, Lang } from '../content/hero';

export interface BookingRequest {
  checkIn: string;   // ISO yyyy-mm-dd
  checkOut: string;  // ISO yyyy-mm-dd
  nights: number;
  adults: number;
  children: number;
  childAges: number[];
  url: string;       // deep link into the booking engine
}

/** The real booking engine of the pension (as linked on kitzalpen.at). */
export const BOOKING_ENGINE = 'https://kitzbuhel.pynbooking.direct/';
/**
 * Deep link format (checked against the engine on 3 Nov 2026):
 *   /search?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&room1=A,A,8
 * room1 lists the guests of room 1: "A" = adult (18+), a number = child's age (0–17).
 * Without dates the engine opens on its availability calendar.
 */
export function bookingUrl(checkIn?: string, checkOut?: string, adults = 2, ages: number[] = []) {
  if (!checkIn || !checkOut) return BOOKING_ENGINE;
  const room = [...Array(adults).fill('A'), ...ages.map(String)].join(',');
  return `${BOOKING_ENGINE}search?checkin=${checkIn}&checkout=${checkOut}&room1=${room}`;
}
export interface BookingBarHandle { focusArrival: () => void }

interface Props {
  copy: Copy;
  lang: Lang;
  /** Fired when the visitor continues to the booking engine (analytics hook). */
  onSubmit: (req: BookingRequest) => void;
}

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const nightsBetween = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);

const CalIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="shrink-0 opacity-90">
    <rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" strokeLinecap="round" />
  </svg>
);
const PersonIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="shrink-0 opacity-90">
    <circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c1.2-3.6 4-5.2 7.5-5.2s6.3 1.6 7.5 5.2" strokeLinecap="round" />
  </svg>
);
const Chevron = ({ up }: { up?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={`shrink-0 transition-transform duration-300 ${up ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function DateField({ label, value, min, onChange, lang, inputRef }: { label: string; value: string; min: string; onChange: (v: string) => void; lang: Lang; inputRef?: React.Ref<HTMLInputElement> }) {
  const id = useId();
  const shown = value
    ? new Date(value + 'T12:00:00').toLocaleDateString(lang === 'de' ? 'de-AT' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : label;
  return (
    <div className="field relative flex min-h-[52px] min-w-0 flex-1 items-center gap-3 px-4 md:px-6">
      <CalIcon />
      <div className="min-w-0 leading-tight">
        {value && <span className="block text-[11px] font-semibold uppercase tracking-[.12em] text-champagne-light/80">{label}</span>}
        <span className={`block truncate text-[16px] ${value ? 'font-semibold' : 'font-medium text-ivory/90'}`}>{shown}</span>
      </div>
      <span className="ml-auto hidden md:block"><Chevron /></span>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        id={id}
        ref={inputRef}
        type="date"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* not allowed – native behaviour */ } }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

function Stepper({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div><div className="text-[15px] font-semibold">{label}</div><div className="text-[13px] text-ivory/60">{hint}</div></div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`${label} −`} disabled={value <= min} onClick={() => onChange(value - 1)} className="step-btn">−</button>
        <span className="w-6 text-center text-[17px] font-semibold tabular-nums" aria-live="polite">{value}</span>
        <button type="button" aria-label={`${label} +`} disabled={value >= max} onClick={() => onChange(value + 1)} className="step-btn">+</button>
      </div>
    </div>
  );
}

export const BookingBar = forwardRef<BookingBarHandle, Props>(function BookingBar({ copy, lang, onSubmit }, ref) {
  const today = useMemo(() => iso(new Date()), []);
  const [checkIn, setIn] = useState('');
  const [checkOut, setOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [kids, setKidsRaw] = useState(0);
  const [ages, setAges] = useState<(number | null)[]>([]);
  const setKids = (n: number) => { setKidsRaw(n); setAges((a) => Array.from({ length: n }, (_, i) => a[i] ?? null)); setMsg(null); };
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);
  const arrivalRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const guestBtn = useRef<HTMLButtonElement>(null);
  const guests = adults + kids;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  useImperativeHandle(ref, () => ({
    focusArrival: () => {
      const el = arrivalRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      try { (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* ignore */ }
    },
  }));

  useEffect(() => {
    if (!guestsOpen) return;
    const off = (e: PointerEvent) => { if (!popRef.current?.contains(e.target as Node) && !guestBtn.current?.contains(e.target as Node)) setGuestsOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setGuestsOpen(false); guestBtn.current?.focus(); } };
    window.addEventListener('pointerdown', off);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('pointerdown', off); window.removeEventListener('keydown', esc); };
  }, [guestsOpen]);

  const setArrival = (v: string) => {
    setIn(v); setMsg(null);
    if (v && (!checkOut || checkOut <= v)) setOut(addDays(v, 1));
  };

  const agesOk = ages.every((x) => x !== null);
  const url = bookingUrl(checkIn, checkOut, adults, ages.filter((x): x is number => x !== null));

  /** The button is a real link to the booking engine; it only stops when input is incomplete. */
  const go = (e: React.MouseEvent<HTMLAnchorElement> | React.FormEvent) => {
    if ((checkIn && !checkOut) || (!checkIn && checkOut)) { e.preventDefault(); setMsg({ kind: 'err', text: copy.errDates }); return; }
    if (checkIn && checkOut <= checkIn) { e.preventDefault(); setMsg({ kind: 'err', text: copy.errOrder }); return; }
    if (!agesOk) { e.preventDefault(); setGuestsOpen(true); setMsg({ kind: 'err', text: copy.errAges }); return; }
    onSubmit({ checkIn, checkOut, nights, adults, children: kids, childAges: ages as number[], url });
    if ('key' in e || e.type === 'submit') { e.preventDefault(); window.open(url, '_blank', 'noopener'); }
    setMsg({ kind: 'ok', text: copy.opened });
  };

  return (
    <form onSubmit={go} noValidate className="booking relative w-full" aria-label={copy.check}>
      <div className="booking-shell relative rounded-[22px] border border-champagne/35 bg-forest-deep/70 text-ivory shadow-[0_24px_60px_rgba(0,0,0,.35)] backdrop-blur-xl md:rounded-full">
        <div className="grid grid-cols-2 md:flex md:items-center md:py-2 md:pl-3 md:pr-2">
          <DateField label={copy.arrival} value={checkIn} min={today} onChange={setArrival} lang={lang} inputRef={arrivalRef} />
          <span aria-hidden className="hidden h-8 w-px bg-ivory/20 md:block" />
          <div className="border-l border-ivory/15 md:contents md:border-0">
            <DateField label={copy.departure} value={checkOut} min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)} onChange={(v) => { setOut(v); setMsg(null); }} lang={lang} />
          </div>
          <span aria-hidden className="hidden h-8 w-px bg-ivory/20 md:block" />

          <div className="relative col-span-1 border-t border-ivory/15 md:flex-1 md:border-0">
            <button
              ref={guestBtn}
              type="button"
              aria-expanded={guestsOpen}
              aria-controls="guest-pop"
              onClick={() => setGuestsOpen((o) => !o)}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left md:px-6"
            >
              <PersonIcon />
              <span className="truncate text-[16px] font-medium">{copy.guestCount(guests)}</span>
              <span className="ml-auto"><Chevron up={guestsOpen} /></span>
            </button>
          </div>

          <div className="col-span-1 flex items-center border-t border-ivory/15 p-2 md:border-0 md:p-0 md:pl-2">
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={go} className="btn-gold flex min-h-11 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-5 text-[15px] font-semibold md:min-h-[54px] md:px-8 md:text-[16px]">
              <span className="md:hidden">{copy.book}</span>
              <span className="hidden md:inline">{copy.check}</span>
              <span className="arrow" aria-hidden>↗</span>
            </a>
          </div>
        </div>

        {guestsOpen && (
          <div
            id="guest-pop"
            ref={popRef}
            role="dialog"
            aria-label={copy.guests}
            className="guest-pop absolute bottom-[calc(100%+10px)] left-0 right-0 z-30 rounded-[20px] border border-champagne/30 bg-forest-deep/95 px-5 py-3 text-ivory shadow-[0_20px_50px_rgba(0,0,0,.4)] backdrop-blur-xl md:left-auto md:right-[220px] md:w-[360px]"
          >
            <Stepper label={copy.adults} hint={copy.adultsHint} value={adults} min={1} max={10} onChange={setAdults} />
            <div className="h-px bg-ivory/10" />
            <Stepper label={copy.children} hint={copy.childrenHint} value={kids} min={0} max={8} onChange={setKids} />
            {kids > 0 && (
              <div className="grid grid-cols-2 gap-2 pb-2 sm:grid-cols-3">
                {ages.map((age, i) => (
                  <label key={i} className="flex flex-col gap-1 text-[12px] text-ivory/70">
                    {copy.childAge(i + 1)}
                    <select value={age ?? ''} onChange={(e) => { const v = e.target.value; setAges((a) => a.map((x, k) => (k === i ? (v === '' ? null : +v) : x))); setMsg(null); }}
                      className={`min-h-11 rounded-[10px] border bg-forest-deep px-2 text-[15px] text-ivory ${age === null ? 'border-champagne/70' : 'border-ivory/25'}`} style={{ colorScheme: 'dark' }}>
                      <option value="">{copy.choose}</option>
                      {Array.from({ length: 18 }, (_, y) => <option key={y} value={y}>{copy.years(y)}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
            <button type="button" onClick={() => { setGuestsOpen(false); guestBtn.current?.focus(); }} className="mt-2 min-h-11 w-full rounded-full border border-ivory/25 text-[14px] font-semibold hover:border-champagne">
              {copy.done}
            </button>
          </div>
        )}
      </div>

      <p role="status" aria-live="polite" className={`booking-msg mx-auto mt-3 max-w-[760px] px-2 text-center text-[13px] leading-snug transition-opacity duration-300 md:text-[14px] ${msg ? 'opacity-100' : 'opacity-0'} ${msg?.kind === 'err' ? 'text-[#ffd2c2]' : 'text-ivory/85'}`}>
        {msg?.text ?? ' '}
      </p>
    </form>
  );
});
