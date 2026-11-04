import { useRef } from 'react';
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
  onLang: (l: Lang) => void;
  onBook?: () => void;
  onMenu: () => void;
}

export function LangSwitch({ lang, onLang, label, className = '' }: { lang: Lang; onLang: (l: Lang) => void; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`flex items-center text-[13px] font-semibold tracking-[.08em] ${className}`}>
      {(['de', 'en'] as Lang[]).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden className="mx-1 h-3.5 w-px bg-current opacity-40" />}
          <button
            type="button"
            onClick={() => onLang(l)}
            aria-pressed={lang === l}
            className={`grid min-h-11 min-w-11 place-items-center rounded-full uppercase transition-opacity duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-champagne ${lang === l ? 'opacity-100' : 'opacity-55 hover:opacity-90'}`}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}

export function Header({ lang, copy, compact, fine, menuOpen, onLang, onMenu, showSeason }: Props) {
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
          <Logo className={`transition-[width] duration-[450ms] ease-premium ${compact ? 'w-[118px] md:w-[136px]' : 'w-[148px] md:w-[178px]'}`} />
        </a>

        <nav aria-label="Hauptnavigation" className="hidden lg:block">
          <ul className="flex items-center gap-[clamp(18px,2.1vw,38px)] text-[15px] font-medium">
            {NAV[lang].map((n, i) => n.mega ? <StayMenu key="stay" lang={lang} label={n.label} /> : (
              <li key={i} className="js-head">
                <a href={n.href} className="nav-link relative inline-flex min-h-11 items-center opacity-90 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-champagne">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 md:gap-5">
          {showSeason && <SeasonToggle active={season} copy={copy} onSelect={setSeason} className="header-season js-head shrink-0" labelClass="max-sm:sr-only" />}
          {/* phones on subpages: the season toggle takes this spot; DE/EN stays in the menu */}
          <LangSwitch lang={lang} onLang={onLang} label={copy.lang} className={`js-head ${showSeason ? 'max-sm:hidden' : ''}`} />
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
