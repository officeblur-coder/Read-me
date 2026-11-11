import type { Copy, Season } from '../content/hero';

const Sun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
  </svg>
);
const Flake = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9.5 3.8 12 5.6l2.5-1.8M9.5 20.2 12 18.4l2.5 1.8M3.6 10.3l2.9.5.6-2.9M20.4 13.7l-2.9-.5-.6 2.9M3.6 13.7l2.9-.5.6 2.9M20.4 10.3l-2.9.5-.6-2.9" />
  </svg>
);

export function SeasonToggle({ active, copy, onSelect, className = '', labelClass = '' }: { active: Season; copy: Copy; onSelect: (s: Season) => void; className?: string; labelClass?: string }) {
  return (
    <div role="group" aria-label={`${copy.summer} / ${copy.winter}`} className={`season-toggle relative grid grid-cols-2 rounded-full border border-ivory/25 bg-forest-deep/55 p-1 backdrop-blur-md ${className}`}>
      <span aria-hidden className="season-knob absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full" style={{ transform: active === 'winter' ? 'translateX(100%)' : 'translateX(0)' }} />
      {(['summer', 'winter'] as Season[]).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={active === s}
          onClick={() => onSelect(s)}
          className={`relative z-[1] flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne md:px-6 ${
            active === s ? 'text-forest-deep' : 'text-ivory/90 hover:text-ivory'
          }`}
        >
          {s === 'summer' ? <Sun /> : <Flake />}
          <span className={labelClass}>{s === 'summer' ? copy.summer : copy.winter}</span>
        </button>
      ))}
    </div>
  );
}
