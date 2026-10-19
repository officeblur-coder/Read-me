import clsx from "clsx";

export function Kpi({
  label,
  value,
  sub,
  tone,
  locked,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "good" | "bad";
  locked?: boolean;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-[12.5px] font-medium text-fg-2">{label}</p>
      {locked ? (
        <p className="mt-2 text-[13px] text-muted">Vizibil pentru proprietar și manager</p>
      ) : (
        <p
          className={clsx(
            "tabular mt-1.5 text-[20px] leading-tight sm:text-[24px] font-semibold tracking-tight",
            tone === "good" && "text-good",
            tone === "bad" && "text-bad",
          )}
        >
          {value}
        </p>
      )}
      {sub && !locked && <p className="mt-1 text-[12.5px] text-muted">{sub}</p>}
    </div>
  );
}
