import { useEffect, useRef, useState } from 'react';
import { SITE_LANGS, type SiteLang } from '../lib/i18n';
import { BOOKING_ENGINE } from './BookingBar';
import { NAV, type Copy, type Lang } from '../content/hero';
import { useMagnetic } from '../lib/hooks';
import { Logo } from './Logo';
import { SeasonToggle } from './SeasonToggle';
import { StayMenu } from './StayMenu';
import { useSeason } from '../lib/season';

interface Props {
  lang: Lang;
  copy: Copy;
  compact: boolean;
  fine: boolean;
  menuOpen: boolean;
  /** subpages have no hero selector, so the shared Sommer/Winter toggle sits in the header */
  showSeason?: boolean;
  site: SiteLang;
  onLang: (l: SiteLang) => void;
  onBook?: () => void;
  onMenu: () => void;
}

/** Language picker: compact dropdown in the header, a full grid in the mobile menu (`grid`). */
export function LangSwitch({ site, onLang, label, className = '', grid = false }: { site: SiteLang; onLang: (l: SiteLang) => void; label: string; className?: string; grid?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (grid) return (
    <div role="group" aria-label={label} translate="no" className={`grid grid-cols-4 gap-2 ${className}`}>
      {SITE_LANGS.map((l) => (
        <button key={l.code} type="button" lang={l.code} onClick={() => onLang(l.code)} aria-pressed={site === l.code}
          className={`lang-pill flex min-h-12 flex-col items-center justify-center rounded-[14px] px-1 text-center ${site === l.code ? 'is-on' : ''}`}>
          <span className="text-[13px] font-semibold uppercase tracking-[.1em]">{l.code}</span>
          <span className="text-[10.5px] opacity-70">{l.name}</span>
        </button>
      ))}
    </div>
  );
  return (
    <div ref={box} translate="no" className={`relative ${className}`}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${SITE_LANGS.find((l) => l.code === site)?.name}`} onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold uppercase tracking-[.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-champagne">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></svg>
        {site}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="lang-menu absolute right-0 top-[calc(100%+8px)] z-[60] w-[208px] overflow-hidden rounded-[18px] p-1.5">
          {SITE_LANGS.map((l) => (
            <li key={l.code}>
              <button type="button" role="option" lang={l.code} aria-selected={site === l.code} onClick={() => { setOpen(false); onLang(l.code); }}
                className={`lang-opt flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left ${site === l.code ? 'is-on' : ''}`}>
                <span className="w-7 text-[12px] font-semibold uppercase tracking-[.1em] opacity-70">{l.code}</span>
                <span className="text-[14.5px] font-medium">{l.name}</span>
                {site === l.code && <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12.5l4.2 4.2L19 7" /></svg>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Header({ lang, copy, compact, fine, menuOpen, site, onLang, onMenu, showSeason }: Props) {
  const { season, setSeason } = useSeason();
  const bookRef = useRef<HTMLAnchorElement>(null);
  useMagnetic(bookRef, fine);

  return (
    <header
      data-compact={compact}
      className={`site-header fixed inset-x-0 z-40 text-ivory transition-[background-color,padding,box-shadow] duration-[450ms] ease-premium ${
        compact ? 'bg-forest/80 shadow-[0_8px_30px_rgba(0,0,0,.18)] backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-6 px-[max(16px,env(safe-area-inset-left))] md:px-10 lg:px-14">
        <a href="#top" aria-label="KitzAlpen – Startseite" className="js-head shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-champagne">
          <Logo className={`transition-[width] duration-[450ms] ease-premium ${compact ? 'w-[150px] md:w-[178px]' : 'w-[176px] md:w-[218px]'}`} />
        </a>

        <nav aria-label="Hauptnavigation" className="hidden lg:block">
          <ul className="flex items-center gap-[clamp(18px,2.1vw,38px)] text-[15px] font-medium">
            {NAV[lang].map((n, i) => n.mega ? <StayMenu key="stay" lang={lang} label={n.label} /> : (
              <li key={i} className="js-head">
                <a href={n.href === '#activities-winter' ? `#activities-${season}` : n.href} className="nav-link relative inline-flex min-h-11 items-center opacity-90 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-champagne">
                  {n.live && <span aria-hidden className="live-dot mr-2" />}{n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 md:gap-5">
          {showSeason && <SeasonToggle active={season} copy={copy} onSelect={setSeason} className="header-season js-head shrink-0" labelClass="max-sm:sr-only" />}
          {/* phones on subpages: the season toggle takes this spot; DE/EN stays in the menu */}
          <LangSwitch site={site} onLang={onLang} label={copy.lang} className={`js-head ${showSeason ? 'max-sm:hidden' : ''}`} />
          <a
            ref={bookRef}
            href={BOOKING_ENGINE}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap js-head btn-outline hidden min-h-11 items-center gap-2.5 rounded-full border border-champagne/70 px-6 text-[15px] font-semibold lg:inline-flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
            {copy.book}
          </a>
          <button
            type="button"
            onClick={onMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? copy.close : copy.menu}
            className="js-head grid h-11 w-11 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-champagne lg:hidden"
          >
            <span className="flex w-7 flex-col gap-[7px]" aria-hidden>
              <i className="block h-[2px] w-full rounded bg-current" />
              <i className="block h-[2px] w-full rounded bg-current" />
              <i className="block h-[2px] w-full rounded bg-current" />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
