export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M8 22.5 14.2 9.5h3.6L24 22.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M11.2 17.5h9.6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Wordmark({ tone = "default" }: { tone?: "default" | "inverse" }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span
        className={`text-[15px] font-semibold tracking-[0.14em] ${tone === "inverse" ? "text-white" : "text-fg"}`}
      >
        AUTOFLOW
      </span>
    </span>
  );
}
