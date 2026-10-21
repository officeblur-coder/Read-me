import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import type { RiskLevel } from '../../domain/types';
import { RISK_LABEL } from '../../domain/labels';

export function Card({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={clsx('rounded-xl border border-ink-200/70 bg-white shadow-card', pad && 'p-5', className)}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-brand-600">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink-900 sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
export function Button({ variant = 'secondary', size = 'md', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-9 px-3.5 text-sm',
        size === 'lg' && 'h-11 px-5 text-[15px]',
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
        variant === 'dark' && 'bg-ink-900 text-white hover:bg-ink-800',
        variant === 'secondary' && 'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50',
        variant === 'ghost' && 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
        variant === 'danger' && 'border border-risk-100 bg-risk-50 text-risk-700 hover:bg-risk-100',
        className,
      )}
    >
      {children}
    </button>
  );
}

type Tone = 'neutral' | 'brand' | 'warn' | 'risk' | 'info' | 'dark';
export function Badge({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium',
        tone === 'neutral' && 'bg-ink-100 text-ink-600',
        tone === 'brand' && 'bg-brand-50 text-brand-700',
        tone === 'warn' && 'bg-warn-50 text-warn-700',
        tone === 'risk' && 'bg-risk-50 text-risk-700',
        tone === 'info' && 'bg-sky-50 text-sky-700',
        tone === 'dark' && 'bg-ink-900 text-white',
        className,
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', tone === 'brand' && 'bg-brand-500', tone === 'warn' && 'bg-warn-500', tone === 'risk' && 'bg-risk-500', (tone === 'neutral' || tone === 'info' || tone === 'dark') && 'bg-current')} />}
      {children}
    </span>
  );
}

export const riskTone = (l: RiskLevel): Tone => (l === 'ok' ? 'brand' : l === 'warn' ? 'warn' : 'risk');
export const riskColor = (l: RiskLevel) => (l === 'ok' ? '#178650' : l === 'warn' ? '#d69a0b' : '#d0402b');

export function RiskBadge({ level, label }: { level: RiskLevel; label?: string }) {
  return <Badge tone={riskTone(level)} dot>{label ?? RISK_LABEL[level]}</Badge>;
}

export function RiskDot({ level, className }: { level: RiskLevel; className?: string }) {
  return <span className={clsx('inline-block h-2 w-2 shrink-0 rounded-full', className)} style={{ background: riskColor(level) }} />;
}

export function Progress({ value, tone = 'brand', marker, className, height = 6 }: { value: number; tone?: Tone | 'lime'; marker?: number; className?: string; height?: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx('relative w-full overflow-hidden rounded-full bg-ink-100', className)} style={{ height }}>
      <div
        className={clsx(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          tone === 'brand' && 'bg-brand-600',
          tone === 'lime' && 'bg-lime-500',
          tone === 'warn' && 'bg-warn-500',
          tone === 'risk' && 'bg-risk-500',
          tone === 'neutral' && 'bg-ink-400',
        )}
        style={{ width: `${v}%` }}
      />
      {marker !== undefined && (
        <div className="absolute top-0 h-full w-0.5 bg-ink-900/70" style={{ left: `calc(${Math.max(0, Math.min(100, marker))}% - 1px)` }} title="Planificat" />
      )}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={clsx('scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b border-ink-200 px-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            value === t.id ? 'border-brand-600 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={clsx('rounded px-1.5 text-[11px] font-semibold', value === t.id ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-500')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={clsx('rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors', value === o.id ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={clsx('h-9 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20', className)}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={clsx('h-9 rounded-lg border border-ink-200 bg-white pl-3 pr-8 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20', className)}
    >
      {children}
    </select>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-ink-700">
      {children}
      {hint && <span className="ml-1 font-normal text-ink-400">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div className={clsx('max-h-[92vh] w-full animate-fade-up overflow-y-auto rounded-t-2xl bg-white shadow-pop sm:rounded-2xl', width)} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-4">
          <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-800" aria-label="Închide"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-ink-300">{icon}</div>}
      <div className="text-sm font-medium text-ink-700">{title}</div>
      {children && <div className="mt-1 max-w-sm text-[13px] text-ink-500">{children}</div>}
    </div>
  );
}

export function KV({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[12px] text-ink-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-ink-900">{children}</div>
    </div>
  );
}

/** Animates numeric changes so updates (approvals, edits) are visible on the dashboard. */
export function useAnimatedNumber(value: number, ms = 700) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const from = display;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setDisplay(from + (value - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

export function Flash({ value, children, className }: { value: unknown; children: ReactNode; className?: string }) {
  const [flash, setFlash] = useState(false);
  const [prev, setPrev] = useState(value);
  useEffect(() => {
    if (prev !== value) {
      setPrev(value);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1600);
      return () => clearTimeout(t);
    }
  }, [value, prev]);
  return <span className={clsx('rounded transition-colors duration-700', flash && 'bg-lime-300/50', className)}>{children}</span>;
}

export function DemoTag({ className, children = 'Date fictive' }: { className?: string; children?: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded border border-dashed border-ink-300 px-1.5 py-px text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-500', className)}>
      {children}
    </span>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className, align = 'left', onClick, active }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center'; onClick?: () => void; active?: boolean }) {
  return (
    <th
      onClick={onClick}
      className={clsx(
        'whitespace-nowrap border-b border-ink-200 px-3 py-2.5 text-[12px] font-medium text-ink-500',
        align === 'right' && 'text-right', align === 'center' && 'text-center',
        onClick && 'cursor-pointer select-none hover:text-ink-900', active && 'text-ink-900',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, align = 'left' }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <td className={clsx('border-b border-ink-100 px-3 py-3 align-middle text-ink-800', align === 'right' && 'whitespace-nowrap text-right tabular-nums', align === 'center' && 'text-center', className)}>
      {children}
    </td>
  );
}
