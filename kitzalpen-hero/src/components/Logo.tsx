/**
 * KitzAlpen logo – approved proposal "A · Classic" (Nov 2026), horizontal header version.
 * Mountain mark + spaced capitals + descriptor. Uses currentColor (ivory on photos, forest elsewhere);
 * the snow cap keeps the champagne accent. `mark` renders the compact mountain sign only.
 */
const PEAKS = 'M4 46 L24 18 L32 28 L44 8 L64 46';
const SNOW = 'M38 17 L44 8 L50 17 L46 15 L44 18 L41 15 Z';

export function Logo({ className = '', mark = false, accent = 'var(--k-gold-light)' }: { className?: string; color?: string; mark?: boolean; accent?: string }) {
  if (mark) return (
    <svg viewBox="0 0 68 54" data-i18n-skip="" className={`block ${className}`} role="img" aria-label="KitzAlpen">
      <path d={PEAKS} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d={SNOW} fill={accent} />
    </svg>
  );
  return (
    <svg viewBox="0 0 330 80" data-i18n-skip="" className={`block ${className}`} role="img" aria-label="KitzAlpen – Pension & Chalet">
      <g transform="translate(0 12)">
        <path d={PEAKS} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
        <path d={SNOW} fill={accent} />
      </g>
      <text x="84" y="45" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="600" fontSize="35" letterSpacing="5.4" fill="currentColor">KITZALPEN</text>
      <line x1="85" y1="59" x2="108" y2="59" stroke={accent} strokeWidth="1.3" />
      <text x="116" y="64" fontFamily="Manrope, system-ui, sans-serif" fontWeight="700" fontSize="13" letterSpacing="3.2" fill="currentColor" opacity=".85">PENSION · CHALET</text>
    </svg>
  );
}
