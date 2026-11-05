import { useEffect, useState } from 'react';
import type { Lang } from '../content/hero';
import { OPENINGS_DEFAULT, SUMMER_LIFTS, todayVienna, type Opening, type OpeningsData } from '../content/seasonOpenings';
import { useSeason } from '../lib/season';

const OVERRIDE = `${import.meta.env.BASE_URL}openings.json`;

/** Default data, optionally replaced by an owner-maintained openings.json on the server. */
function useOpenings() {
  const [data, setData] = useState<OpeningsData>(OPENINGS_DEFAULT);
  useEffect(() => {
    let alive = true;
    fetch(OVERRIDE, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (alive && j && Array.isArray(j.items) && j.verifiedAt) setData(j as OpeningsData);
    }).catch(() => { /* no override – keep defaults */ });
    return () => { alive = false; };
  }, []);
  return data;
}

const Flake = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden className="shrink-0"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" /></svg>
);

/**
 * Slim strip under the weather bar. Winter: PLANNED season starts (verified, dated) – before the date
 * "planned from …", from the date on a link to the operator's live status (never an invented "open").
 * Summer: links to the operators' summer timetables only.
 */
export function OpeningsBar({ lang }: { lang: Lang }) {
  const { season } = useSeason();
  const data = useOpenings();
  const today = todayVienna();
  const loc = lang === 'de' ? 'de-AT' : 'en-GB';
  const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  const L = lang === 'de'
    ? { title: `Saisonstart ${data.season}`, planned: 'geplant ab', started: 'Saisonstart lt. Plan', live: 'Live-Status', open: 'in Betrieb lt. Betreiber',
        note: 'Geplante Termine – abhängig von Schnee und Wetter; Saisonstart heißt nicht, dass alle Pisten offen sind.', checked: 'geprüft', summer: 'Sommerbetrieb der Bergbahnen', times: 'Zeiten' }
    : { title: `Season start ${data.season}`, planned: 'planned from', started: 'season start as planned', live: 'Live status', open: 'open per operator',
        note: 'Planned dates – depending on snow and weather; season start does not mean all pistes are open.', checked: 'checked', summer: 'Mountain lifts in summer', times: 'Times' };

  const sorted = [...data.items].sort((a, b) => (a.start ?? '0').localeCompare(b.start ?? '0'));
  const item = (o: Opening) => {
    const upcoming = o.start && o.start > today;
    return (
      <li key={o.id} className="ob-item flex shrink-0 items-center gap-2 whitespace-nowrap">
        <a href={upcoming || !o.live ? o.url : o.live} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[30px] items-center gap-2 hover:text-gold-light">
          <span className="font-semibold text-cream">{o.name}</span>
          {o.status === 'operator-open' ? <span className="text-[#8fd6a3]">{L.open}</span>
            : upcoming ? <span className="text-cream/70">{L.planned} <b className="font-semibold text-gold-light">{day(o.start!)}</b></span>
            : <span className="text-cream/70">{L.started} {o.start ? day(o.start) : ''} · <u className="decoration-gold-light/60 underline-offset-2">{L.live}</u></span>}
          {o.note && upcoming && <span className="hidden text-cream/50 xl:inline">({o.note[lang]})</span>}
        </a>
      </li>
    );
  };

  return (
    <aside aria-label={season === 'winter' ? L.title : L.summer} className="openings-bar border-b border-gold/15 text-[12px] text-cream">
      <div className="flex h-full items-center">
        <p className="flex h-full shrink-0 items-center gap-2 pl-[max(14px,env(safe-area-inset-left))] pr-3 text-[10.5px] font-semibold uppercase tracking-[.2em] text-gold-light">
          <Flake /><span className="max-sm:sr-only">{season === 'winter' ? L.title : L.summer}</span>
        </p>
        <ul className="rs-track flex min-w-0 flex-1 items-center gap-5 overflow-x-auto pr-4">
          {season === 'winter' ? sorted.map(item) : SUMMER_LIFTS.map((s) => (
            <li key={s.name} className="shrink-0 whitespace-nowrap"><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[30px] items-center gap-2 hover:text-gold-light"><span className="font-semibold">{s.name}</span><span className="text-cream/60">{L.times} ↗</span></a></li>
          ))}
          {season === 'winter' && <li className="shrink-0 whitespace-nowrap text-[11px] text-cream/45" title={L.note}>{L.note.split(';')[0]} · {L.checked} {day(data.verifiedAt)}</li>}
        </ul>
      </div>
    </aside>
  );
}
