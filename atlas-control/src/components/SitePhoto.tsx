// Procedural site imagery. The demo has no real photos of Atlas Sport works, so each photo is a
// generated, clearly labelled illustration of the construction stage it documents.
import { useId } from 'react';
import clsx from 'clsx';
import type { PhotoStage } from '../domain/types';
import { prng } from '../data/demo/generate';

interface Props {
  stage: PhotoStage;
  seed: number;
  className?: string;
  label?: boolean;
  dataUrl?: string;
}

export function SitePhoto({ stage, seed, className, label = true, dataUrl }: Props) {
  const uid = useId().replace(/:/g, '');
  if (dataUrl) {
    return (
      <div className={clsx('relative overflow-hidden bg-ink-200', className)}>
        <img src={dataUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  const r = prng(seed);
  const overcast = stage === 'apa' || r() < 0.3;
  const skyTop = overcast ? '#9aa6a6' : '#8fb7d6';
  const skyBottom = overcast ? '#d2d7d4' : '#e4ece9';
  const tilt = (r() - 0.5) * 16;
  const hor = 92 + r() * 14;

  // Pitch trapezoid in perspective
  const nearY = 250, farY = hor + 22;
  const nearL = 18 + tilt, nearR = 382 + tilt, farL = 120 - tilt / 2, farR = 300 - tilt / 2;
  const pitch = `M${nearL},${nearY} L${farL},${farY} L${farR},${farY} L${nearR},${nearY} Z`;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const rowY = (t: number) => lerp(nearY, farY, t);
  const rowX = (t: number, side: 0 | 1) => (side ? lerp(nearR, farR, t) : lerp(nearL, farL, t));

  const soil = stage === 'apa' ? '#7d6448' : '#8f7253';
  const gravel = '#a7a39b';
  const surface =
    stage === 'decopertare' || stage === 'excavatie' || stage === 'apa' ? soil
      : stage === 'drenaj' ? '#957a5c'
        : stage === 'fundatie' || stage === 'imprejmuire' ? gravel
          : stage === 'joaca' ? '#5e8a4a' : '#3f8f4a';

  const trees = Array.from({ length: 16 }, (_, i) => ({ x: i * 27 + r() * 14 - 8, h: 12 + r() * 16, w: 16 + r() * 16 }));

  return (
    <div className={clsx('relative overflow-hidden bg-ink-200', className)}>
      <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="Imagine demonstrativă de șantier">
        <defs>
          <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyBottom} />
          </linearGradient>
          <linearGradient id={`grd${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7b8f63" />
            <stop offset="1" stopColor="#5f7448" />
          </linearGradient>
          <filter id={`n${uid}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed % 97} result="t" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer><feFuncA type="linear" slope="0.22" /></feComponentTransfer>
            <feBlend in="SourceGraphic" mode="multiply" />
          </filter>
          <radialGradient id={`v${uid}`} cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.35" />
          </radialGradient>
          <pattern id={`stripe${uid}`} width="40" height="260" patternUnits="userSpaceOnUse">
            <rect width="20" height="260" fill="#ffffff" opacity="0.05" />
          </pattern>
        </defs>

        <g filter={`url(#n${uid})`}>
          <rect width="400" height={hor + 4} fill={`url(#sky${uid})`} />
          {/* distant hills and tree line */}
          <path d={`M0,${hor} Q100,${hor - 18 - r() * 10} 200,${hor - 6} T400,${hor - 4} V${hor + 6} H0 Z`} fill="#8aa08b" opacity="0.6" />
          {trees.map((t, i) => (
            <ellipse key={i} cx={t.x} cy={hor + 2} rx={t.w / 2} ry={t.h / 2} fill={i % 3 ? '#4d6a45' : '#3e5a3a'} />
          ))}
          <rect y={hor + 2} width="400" height={260 - hor} fill={`url(#grd${uid})`} />

          {/* pitch area */}
          <path d={pitch} fill={surface} />
          {(stage === 'suprafata' || stage === 'finalizat') && (
            <g>
              {/* mowing-like stripes of synthetic turf */}
              {Array.from({ length: 9 }, (_, i) => {
                const t0 = i / 9, t1 = (i + 0.5) / 9;
                if (stage === 'suprafata' && i > 4) return null;
                return (
                  <path key={i} d={`M${lerp(nearL, nearR, t0)},${nearY} L${lerp(farL, farR, t0)},${farY} L${lerp(farL, farR, t1)},${farY} L${lerp(nearL, nearR, t1)},${nearY} Z`} fill="#ffffff" opacity="0.06" />
                );
              })}
              {stage === 'suprafata' && (
                <>
                  <path d={`M${lerp(nearL, nearR, 0.56)},${nearY} L${lerp(farL, farR, 0.56)},${farY} L${farR},${farY} L${nearR},${nearY} Z`} fill={gravel} />
                  {[0.62, 0.72, 0.82].map((t, i) => (
                    <rect key={i} x={lerp(nearL, nearR, t)} y={nearY - 22 - i * 4} width="34" height="11" rx="5" fill="#2f7a3c" transform={`skewX(${-8 + tilt / 4})`} />
                  ))}
                </>
              )}
            </g>
          )}
          {stage === 'finalizat' && (
            <g stroke="#f5f5f0" strokeWidth="1.6" fill="none" opacity="0.92">
              <path d={pitch} strokeWidth="2" />
              <path d={`M${lerp(nearL, farL, 0.45)},${rowY(0.45)} L${lerp(nearR, farR, 0.45)},${rowY(0.45)}`} />
              <ellipse cx={(rowX(0.45, 0) + rowX(0.45, 1)) / 2} cy={rowY(0.45)} rx="30" ry="9" />
              <path d={`M${lerp(nearL, nearR, 0.32)},${nearY} L${lerp(rowX(0.16, 0), rowX(0.16, 1), 0.34)},${rowY(0.16)} L${lerp(rowX(0.16, 0), rowX(0.16, 1), 0.66)},${rowY(0.16)} L${lerp(nearL, nearR, 0.68)},${nearY}`} />
              <path d={`M${lerp(farL, farR, 0.38)},${farY} L${lerp(rowX(0.88, 0), rowX(0.88, 1), 0.37)},${rowY(0.88)} L${lerp(rowX(0.88, 0), rowX(0.88, 1), 0.63)},${rowY(0.88)} L${lerp(farL, farR, 0.62)},${farY}`} />
              {/* far goal */}
              <path d={`M${lerp(farL, farR, 0.45)},${farY} v-8 h${(farR - farL) * 0.1} v8`} strokeWidth="1.4" />
            </g>
          )}

          {(stage === 'decopertare' || stage === 'excavatie' || stage === 'apa') && (
            <g>
              {Array.from({ length: 7 }, (_, i) => (
                <path key={i} d={`M${lerp(nearL, nearR, 0.1 + i * 0.12)},${nearY} Q${200 + tilt},${(nearY + farY) / 2} ${lerp(farL, farR, 0.15 + i * 0.1)},${farY}`} stroke="#6e573f" strokeWidth="2" fill="none" opacity="0.5" />
              ))}
              <ellipse cx={330 + tilt} cy={hor + 40} rx="46" ry="16" fill="#6f5638" />
              <ellipse cx={322 + tilt} cy={hor + 34} rx="30" ry="12" fill="#7d6243" />
              {stage === 'excavatie' && <path d={`M${lerp(nearL, nearR, 0.15)},${nearY} L${lerp(farL, farR, 0.2)},${farY + 30} L${lerp(farL, farR, 0.55)},${farY + 30} L${lerp(nearL, nearR, 0.6)},${nearY} Z`} fill="#6b5236" />}
              {stage === 'apa' && (
                <g>
                  <path d={`M${80 + tilt},${200} q40,-22 110,-8 q50,10 40,30 q-40,20 -120,8 q-50,-10 -30,-30 z`} fill="#8c9ea3" opacity="0.92" />
                  <path d={`M${210 + tilt},${150} q30,-10 70,-2 q26,8 6,16 q-40,10 -70,2 q-20,-8 -6,-16 z`} fill="#93a6aa" opacity="0.9" />
                  <path d={`M${110 + tilt},${196} h70`} stroke="#c9d3d4" strokeWidth="1.5" opacity="0.7" />
                  <path d={`M${230 + tilt},${152} h36`} stroke="#c9d3d4" strokeWidth="1.2" opacity="0.7" />
                </g>
              )}
              <Excavator x={72 + tilt} y={hor + 56} s={0.9} />
            </g>
          )}

          {stage === 'drenaj' && (
            <g stroke="#5f5a52" strokeWidth="3" opacity="0.85">
              <path d={`M${(nearL + nearR) / 2},${nearY} L${(farL + farR) / 2},${farY}`} stroke="#d9d4c7" strokeWidth="5" />
              {Array.from({ length: 8 }, (_, i) => {
                const t = 0.08 + i * 0.11;
                const cx = (rowX(t, 0) + rowX(t, 1)) / 2;
                return (
                  <g key={i}>
                    <path d={`M${cx},${rowY(t)} L${lerp(cx, rowX(t + 0.08, 0), 0.9)},${rowY(t + 0.08)}`} stroke="#cfc8b8" strokeWidth={4 - t * 2} />
                    <path d={`M${cx},${rowY(t)} L${lerp(cx, rowX(t + 0.08, 1), 0.9)},${rowY(t + 0.08)}`} stroke="#cfc8b8" strokeWidth={4 - t * 2} />
                  </g>
                );
              })}
            </g>
          )}

          {(stage === 'fundatie' || stage === 'imprejmuire') && (
            <g>
              {Array.from({ length: 140 }, (_, i) => (
                <circle key={i} cx={lerp(nearL + 10, nearR - 10, r())} cy={lerp(farY + 6, nearY - 4, r())} r={0.6 + r() * 1.2} fill={r() > 0.5 ? '#8f8b84' : '#bcb8b0'} />
              ))}
              {stage === 'fundatie' && <Roller x={250 + tilt} y={hor + 70} />}
            </g>
          )}

          {(stage === 'imprejmuire' || stage === 'finalizat') && (
            <g stroke="#3d4642" strokeWidth="1.4">
              {Array.from({ length: 12 }, (_, i) => {
                const t = i / 11;
                const x = lerp(farL - 14, farR + 14, t);
                return <line key={i} x1={x} y1={farY - 2} x2={x} y2={farY - 26} />;
              })}
              <rect x={farL - 14} y={farY - 26} width={farR - farL + 28} height="24" fill="#3d4642" opacity="0.12" stroke="none" />
              {[farL - 30, farR + 30].map((x, i) => (
                <g key={i}>
                  <line x1={x} y1={farY} x2={x} y2={farY - 64} strokeWidth="2" />
                  <rect x={x - 7} y={farY - 70} width="14" height="6" fill="#e8e8e2" stroke="#3d4642" strokeWidth="1" />
                </g>
              ))}
              {[nearL + 6, nearR - 6].map((x, i) => (
                <line key={`n${i}`} x1={x} y1={nearY - 70} x2={x + (i ? -10 : 10)} y2={farY} strokeWidth="1.2" opacity="0.5" />
              ))}
            </g>
          )}

          {stage === 'joaca' && (
            <g>
              <path d={`M${110 + tilt},${200} q90,-40 190,0 q-20,40 -100,40 q-80,0 -90,-40 z`} fill="#a4544a" opacity="0.85" />
              <path d={`M${150 + tilt},${150} q60,-20 120,0 q-10,22 -60,22 q-50,0 -60,-22 z`} fill="#3f7d64" opacity="0.85" />
              {/* tower + slide */}
              <g transform={`translate(${170 + tilt},${118})`} stroke="#4a3b2c" strokeWidth="1.5">
                <rect x="0" y="20" width="34" height="52" fill="#c9a26b" />
                <path d="M-4,22 L17,0 L38,22 Z" fill="#2f6b4f" />
                <path d="M34,40 q30,10 46,40" stroke="#c4c9c8" strokeWidth="6" fill="none" />
                <line x1="6" y1="72" x2="6" y2="86" /><line x1="28" y1="72" x2="28" y2="86" />
              </g>
              {/* swing */}
              <g transform={`translate(${80 + tilt},${142})`} stroke="#4a3b2c" strokeWidth="2" fill="none">
                <path d="M0,46 L14,0 L28,46 M14,0 H76 M62,46 L76,0 L90,46" />
                <line x1="38" y1="0" x2="38" y2="30" strokeWidth="1" /><line x1="52" y1="0" x2="52" y2="30" strokeWidth="1" />
                <ellipse cx="45" cy="32" rx="10" ry="3" fill="#3a3a3a" stroke="none" />
              </g>
            </g>
          )}
          <rect width="400" height="260" fill={`url(#stripe${uid})`} opacity="0.5" />
        </g>
        <rect width="400" height="260" fill={`url(#v${uid})`} />
      </svg>
      {label && (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.06em] text-white/90 backdrop-blur-sm">
          Imagine demonstrativă
        </span>
      )}
    </div>
  );
}

function Excavator({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x="-26" y="12" width="52" height="10" rx="5" fill="#2b2b2b" />
      <rect x="-20" y="-6" width="34" height="18" rx="2" fill="#d7a321" />
      <rect x="-4" y="-18" width="16" height="13" fill="#d7a321" />
      <rect x="-1" y="-15" width="10" height="7" fill="#9bb5c2" />
      <path d="M14,-4 L40,-26 L58,0" stroke="#c4911c" strokeWidth="5" fill="none" strokeLinejoin="round" />
      <path d="M54,-2 l10,8 l-12,4 z" fill="#3a3a3a" />
    </g>
  );
}

function Roller({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-24" y="4" width="22" height="16" rx="8" fill="#4a4a4a" />
      <rect x="-6" y="-8" width="30" height="20" rx="2" fill="#d7a321" />
      <rect x="2" y="-20" width="14" height="12" fill="#2e2e2e" opacity="0.8" />
      <circle cx="16" cy="16" r="6" fill="#2b2b2b" />
    </g>
  );
}
