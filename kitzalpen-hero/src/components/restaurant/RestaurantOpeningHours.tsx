import { useEffect, useState } from 'react';
import type { RestCopy } from '../../content/restaurant';

/** Is the kitchen open right now, in Hollersbach local time? (Tue–Sun, 8–10 and 17–21) */
function useLiveState(lang: 'de' | 'en') {
  const calc = () => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
    const day = g('weekday'), m = +g('hour') * 60 + +g('minute');
    if (day === 'Mon') return { open: false, text: lang === 'de' ? 'Heute Ruhetag' : 'Closed today' };
    if (m >= 480 && m < 600) return { open: true, text: lang === 'de' ? 'Jetzt: Frühstück' : 'Now: breakfast' };
    if (m >= 1020 && m < 1260) return { open: true, text: lang === 'de' ? 'Jetzt: Abendessen' : 'Now: dinner' };
    return { open: false, text: lang === 'de' ? 'Gerade geschlossen' : 'Closed right now' };
  };
  const [s, set] = useState(calc);
  useEffect(() => { set(calc()); const t = setInterval(() => set(calc()), 60000); return () => clearInterval(t); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return s;
}

const Clock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="8.5" /><path className="rh-hand" d="M12 7.5V12l3 2" /></svg>
);

export function RestaurantOpeningHours({ copy, lang }: { copy: RestCopy; lang: 'de' | 'en' }) {
  const live = useLiveState(lang);
  return (
    <div className="js-rhours rounded-[16px] border border-pine/15 bg-[#FAF8F3] px-5 py-5 lg:rounded-full lg:px-8 lg:py-4">
      <div className="flex flex-col items-center gap-3 text-center lg:flex-row lg:justify-between lg:gap-6 lg:text-left">
        <p className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[.22em] text-[#8a6a2f]"><Clock />{copy.hoursTitle}</p>
        {copy.hours.map(([k, v]) => (
          <p key={k} className="flex items-baseline gap-3 text-[15px] text-ink lg:border-l lg:border-pine/15 lg:pl-6">
            <span className="text-ink/70">{k}</span><span className="font-semibold tabular-nums">{v}</span>
          </p>
        ))}
        <p className="text-[15px] font-semibold text-ink lg:border-l lg:border-pine/15 lg:pl-6">{copy.days}<span className="ml-2 font-normal text-ink/60">· {copy.closed}</span></p>
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink/80" aria-live="polite">
          <span className={`h-2 w-2 rounded-full ${live.open ? 'bg-[#2f9e44] shadow-[0_0_0_4px_rgba(47,158,68,.18)]' : 'bg-ink/30'}`} />{live.text}
        </p>
      </div>
    </div>
  );
}
