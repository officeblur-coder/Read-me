import type { RestIcon } from '../../content/restaurant';

const PATHS: Record<RestIcon, string[]> = {
  breakfast: ['M5 11h11v3.4a4.6 4.6 0 0 1-4.6 4.6H9.6A4.6 4.6 0 0 1 5 14.4V11Z', 'M16 12.2h1.4a2.2 2.2 0 0 1 0 4.4H16', 'M3.5 21h14', 'M8.5 8.6c-.9-1 .9-2 0-3.2M12.3 8.6c-.9-1 .9-2 0-3.2'],
  regional: ['M5.2 16.5a6.8 6.8 0 0 1 13.6 0', 'M3.5 16.8h17', 'M12 9.7V8.3M10.6 8.2h2.8', 'M5 19.8h14'],
  cosy: ['M6 20l3.4-6.2L7.6 14 11 7.8 9.6 8 12 3.5 14.4 8 13 7.8l3.4 6.2-1.8-.2L18 20Z', 'M12 20v1.5', 'M3 20h18'],
  bar: ['M6 3.5h5l-.6 6.2a1.9 1.9 0 0 1-3.8 0Z', 'M8.5 11.6V20M6.5 20h4', 'M13 3.5h5l-.6 6.2a1.9 1.9 0 0 1-3.8 0Z', 'M15.5 11.6V20M13.5 20h4'],
};

export function RestIconSvg({ name, size = 34 }: { name: RestIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rh-icon">
      {PATHS[name].map((d, i) => <path key={i} d={d} pathLength={1} />)}
    </svg>
  );
}

/** Desktop: one row of four, separated by hairlines. Mobile: 2 × 2 cards. */
export function RestaurantHighlights({ items }: { items: { icon: RestIcon; label: string }[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-0">
      {items.map((h) => (
        <li key={h.icon} className="js-rh cf-item flex flex-col items-center justify-center gap-2.5 rounded-[12px] border border-pine/10 bg-[#FAF8F3] px-3 py-4 text-center md:rounded-none md:border-0 md:border-l md:border-pine/15 md:bg-transparent md:py-2 md:first:border-l-0">
          <span className="text-[#8a6a2f]"><RestIconSvg name={h.icon} /></span>
          <span className="max-w-[14ch] text-[14px] font-medium leading-snug text-ink md:text-[16px]">{h.label}</span>
        </li>
      ))}
    </ul>
  );
}
