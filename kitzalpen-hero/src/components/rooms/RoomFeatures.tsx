import type { FeatureIcon, RoomFeature } from '../../content/rooms';

/** Line icons on a 24px grid, 1.5 stroke – one weight for all four. */
const ICONS: Record<FeatureIcon, JSX.Element> = {
  bed: (
    <>
      <path d="M3 18.5v-11" />
      <path d="M21 18.5v-5.5a2 2 0 0 0-2-2H3" />
      <path d="M3 15.5h18" />
      <rect x="5" y="7.5" width="5.2" height="3.5" rx="1.3" />
    </>
  ),
  alpine: (
    <>
      <path d="M2 19 8.8 7.5l4 6.8" />
      <path d="M10.4 19l5.4-8.8L22 19" />
      <path d="M6.6 11.3 8.8 12.6l1.7-1.5" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.8 9.2a13.2 13.2 0 0 1 18.4 0" />
      <path d="M5.9 12.5a8.8 8.8 0 0 1 12.2 0" />
      <path d="M9 15.7a4.3 4.3 0 0 1 6 0" />
      <circle cx="12" cy="19" r=".9" fill="currentColor" />
    </>
  ),
  breakfast: (
    <>
      <path d="M7 3v6a2 2 0 0 1-2 2v10M5 11a2 2 0 0 1-2-2V3M5 3v5" />
      <path d="M17 21V3c-2 1.5-3 4-3 7 0 2 1 3 3 3" />
    </>
  ),
};

export function FeatureIconSvg({ name, size = 28 }: { name: FeatureIcon; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

function Verify({ text }: { text: string }) {
  return (
    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-dashed border-gold px-2 py-[1px] text-[10px] font-semibold uppercase tracking-[.08em] text-goldink" title="Auf kitzalpen.at noch nicht bestätigt">
      {text}
    </span>
  );
}

/** Desktop: vertical list (icon + title). Mobile: one row of four. */
export function RoomFeatures({ features }: { features: RoomFeature[] }) {
  return (
    <>
      <ul className="hidden flex-col lg:flex">
        {features.map((f) => (
          <li key={f.title} className="js-rf flex items-center gap-6 border-b border-pine/10 py-6 first:pt-0">
            <span className="w-9 shrink-0 text-pine"><FeatureIconSvg name={f.icon} size={34} /></span>
            <div className="min-w-0">
              <h3 className="max-w-[16ch] text-[17px] font-medium leading-snug text-ink">{f.title}</h3>
              {f.verify && <Verify text={f.verify} />}
            </div>
          </li>
        ))}
      </ul>
      <ul className="grid grid-cols-4 gap-2 lg:hidden">
        {features.map((f) => (
          <li key={f.title} className="js-rf flex flex-col items-center gap-2 text-center">
            <span className="text-pine"><FeatureIconSvg name={f.icon} size={30} /></span>
            <span className="text-[12px] font-medium leading-tight text-ink sm:text-[13px]">{f.short}</span>
            {f.verify && <Verify text={f.verify} />}
          </li>
        ))}
      </ul>
    </>
  );
}
