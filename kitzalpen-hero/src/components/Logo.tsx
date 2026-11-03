const SRC = `${import.meta.env.BASE_URL}images/logo-kitzalpen.png`;

/**
 * The original KitzAlpen logo (transparent PNG from kitzalpen.at), used as a
 * CSS mask so the exact letterforms stay untouched while the colour adapts
 * (ivory on photography, forest or champagne elsewhere).
 */
export function Logo({ className = '', color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <span
      role="img"
      aria-label="KitzAlpen Pension"
      className={`block aspect-[768/302] ${className}`}
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${SRC})`,
        maskImage: `url(${SRC})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'left center',
        maskPosition: 'left center',
      }}
    />
  );
}
