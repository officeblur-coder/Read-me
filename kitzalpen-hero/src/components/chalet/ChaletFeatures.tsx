import { useRef } from 'react';
import type { ChaletIcon } from '../../content/chalet';

/** Line icons, 24px grid, 1.4 stroke, pathLength=1 so they can be (re)drawn. */
const ICON: Record<ChaletIcon, string[]> = {
  guests: ['M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M3 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5', 'M16 10.6a2.6 2.6 0 1 0 0-5.2', 'M16.8 14.6c2.2.4 3.7 2 4.2 4.9'],
  kitchen: ['M5 10.5h14v6.5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6.5Z', 'M3 10.5h18', 'M10 7.5h4', 'M12 7.5V5.8'],
  bath: ['M3.5 12h17v2.5a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5V12Z', 'M6 12V6.4a2.2 2.2 0 0 1 4.2-.9', 'M7 19.5l-1 1.5M17 19.5l1 1.5'],
  living: ['M5 11V8.5a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 8.5V11', 'M3 12.2a1.7 1.7 0 0 1 3.4 0v2.3h11.2v-2.3a1.7 1.7 0 0 1 3.4 0V18H3v-5.8Z', 'M5 18v1.5M19 18v1.5'],
  beds: ['M4 3.5v17M20 3.5v17', 'M4 9.5h16M4 16h16', 'M6.5 7.5h4', 'M6.5 14h4', 'M16 3.5l-2.5 0'],
};

export function ChaletIconSvg({ name, size = 30 }: { name: ChaletIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="cf-icon">
      {ICON[name].map((d, i) => <path key={i} d={d} pathLength={1} />)}
    </svg>
  );
}

function Item({ icon, label, wide }: { icon: ChaletIcon; label: string; wide?: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const tap = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || !ref.current) return;
    const el = ref.current; el.classList.remove('tap'); void el.offsetWidth; el.classList.add('tap');
    window.setTimeout(() => el.classList.remove('tap'), 1000);
  };
  return (
    <li
      ref={ref}
      onPointerDown={tap}
      className={`cf-item js-cf flex flex-col items-center justify-center gap-2 rounded-[12px] border border-pine/10 bg-soft px-3 py-4 text-center lg:flex-row lg:justify-start lg:gap-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-3 lg:text-left ${wide ? 'col-span-2 lg:col-span-1' : ''}`}
    >
      <span className="text-pine"><ChaletIconSvg name={icon} /></span>
      <span className="text-[14px] font-medium leading-snug text-ink sm:text-[15px] lg:text-[17px]">{label}</span>
    </li>
  );
}

export function ChaletFeatures({ items }: { items: { icon: ChaletIcon; label: string }[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-1 lg:gap-0">
      {items.map((f, i) => <Item key={f.icon} icon={f.icon} label={f.label} wide={i === items.length - 1 && items.length % 2 === 1} />)}
    </ul>
  );
}
