import { forwardRef } from 'react';

/**
 * Bottom edge of the dark section: a minimal ridge line filled with the colour
 * of the next section. While scrolling, the cream ridge rises and a fine gold
 * line traces the crest (scrubbed from AmenitiesSection).
 */
export const AlpineTransition = forwardRef<HTMLDivElement, { fill?: string }>(function AlpineTransition({ fill = '#F5F1E9' }, ref) {
  const crest = 'M0 118 L70 96 L128 104 L196 70 L248 84 L310 40 L352 62 L398 30 L452 72 L520 58 L590 90 L660 66 L720 84 L790 52 L842 74 L905 44 L960 70 L1030 88 L1100 64 L1170 92 L1240 80 L1310 100 L1380 86 L1440 104';
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-[90px] sm:h-[130px] lg:h-[170px]">
      <svg viewBox="0 0 1440 170" preserveAspectRatio="none" className="h-full w-full">
        <path className="js-ridge-fill" d={`${crest} L1440 170 L0 170 Z`} fill={fill} />
        <path className="js-ridge-line" d={crest} fill="none" stroke="#D7B77B" strokeWidth="1.2" vectorEffect="non-scaling-stroke" pathLength={1} />
      </svg>
    </div>
  );
});
