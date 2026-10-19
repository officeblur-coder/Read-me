import clsx from "clsx";

export function Field({
  label,
  name,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  name?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[12.5px] text-bad" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormAlert({ children, tone = "bad" }: { children: React.ReactNode; tone?: "bad" | "good" | "warn" | "info" }) {
  return (
    <div
      role="alert"
      className={clsx(
        "rounded-lg border px-3.5 py-2.5 text-[13px]",
        tone === "bad" && "border-bad/25 bg-bad-soft text-bad",
        tone === "good" && "border-good/25 bg-good-soft text-good",
        tone === "warn" && "border-warn/25 bg-warn-soft text-warn",
        tone === "info" && "border-info/25 bg-info-soft text-info",
      )}
    >
      {children}
    </div>
  );
}

export function inputClass(error?: string) {
  return clsx("input", error && "border-bad focus:border-bad focus:ring-bad/15");
}
