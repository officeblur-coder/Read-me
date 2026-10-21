// Product mark for ATLAS CONTROL (not the Atlas Sport logo): an "A" over a pitch line.
export function AtlasLogo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      <rect width="34" height="34" rx="8" fill="#0e713c" />
      <path d="M10 25 17 9l7 16" stroke="#8cc63f" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 19.5h9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
