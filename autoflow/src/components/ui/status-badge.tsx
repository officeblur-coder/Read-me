import clsx from "clsx";
import { STATUS_LABELS, type VehicleStatus } from "@/lib/vehicle-status";

const STYLES: Record<VehicleStatus, string> = {
  preparation: "bg-surface-2 text-fg-2 [--dot:var(--muted)]",
  available: "bg-good-soft text-good [--dot:var(--good)]",
  reserved: "bg-warn-soft text-warn [--dot:var(--warn)]",
  sold: "bg-info-soft text-info [--dot:var(--info)]",
  withdrawn: "bg-surface-2 text-muted [--dot:var(--border-strong)]",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = (status in STYLES ? status : "preparation") as VehicleStatus;
  return (
    <span
      className={clsx(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap",
        STYLES[s],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-[var(--dot)]" />
      {STATUS_LABELS[s]}
    </span>
  );
}
