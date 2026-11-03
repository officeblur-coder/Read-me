import type { FeatureIcon, RoomFeature } from '../../content/rooms';

/** Line icons: 24px grid, 1.5 stroke, same weight for all four. */
const ICONS: Record<FeatureIcon, JSX.Element> = {
  bed: (
    <>
      <path d="M3 18.5v-9M21 18.5V13a2 2 0 0 0-2-2H3" />
      <path d="M3 15.5h18" />
      <rect x="5" y="8" width="5" height="3" rx="1.2" />
    </>
  ),
  alpine: (
    <>
      <path d="M2.5 19.5 9 8l3.6 6.2" />
      <path d="M10.6 19.5 15.5 11l6 8.5" />
      <path d="M7.1 11.4 9 12.5l1.6-1.4" />
      <path d="M2.5 19.5h19" />
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
      <path d="M4 10h12v4.5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V10Z" />
      <path d="M16 11.2h1.6a2.4 2.4 0 0 1 0 4.8H15.6" />
      <path d="M8 3.8c-.8.9.8 1.8 0 2.8M12 3.8c-.8.9.8 1.8 0 2.8" />
    </>
  ),
};

export function FeatureIconSvg({ name }: { name: FeatureIcon }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export function RoomFeatures({ features, className = '' }: { features: RoomFeature[]; className?: string }) {
  return (
    <ul className={`grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-1 lg:gap-0 ${className}`}>
      {features.map((f) => (
        <li key={f.title} className="js-rf flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-5 lg:border-b lg:border-pine/10 lg:py-6 lg:first:pt-0">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-pine/15 text-pine">
            <FeatureIconSvg name={f.icon} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-snug text-ink md:text-[16px]">{f.title}</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-ink/70 md:text-[15px]">{f.text}</p>
            {f.verify && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-dashed border-gold px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.08em] text-[#8a6a2f]" title="Auf kitzalpen.at noch nicht bestätigt">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" strokeLinecap="round" /></svg>
                {f.verify}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
