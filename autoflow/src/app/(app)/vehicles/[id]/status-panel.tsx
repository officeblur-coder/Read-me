"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, type VehicleStatus } from "@/lib/vehicle-status";
import { parseMoneyToCents } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { FormAlert } from "@/components/ui/field";
import { changeStatusAction, deleteVehicleAction } from "../actions";

const ACTION_LABELS: Record<VehicleStatus, string> = {
  preparation: "Mută în pregătire",
  available: "Marchează disponibil",
  reserved: "Rezervă",
  sold: "Înregistrează vânzarea",
  withdrawn: "Retrage din vânzare",
};

export function StatusPanel({
  vehicleId,
  status,
  allowed,
  listPrice,
  minPrice,
  currency,
  canDelete,
}: {
  vehicleId: string;
  status: VehicleStatus;
  allowed: VehicleStatus[];
  listPrice: number | null;
  minPrice: number | null | undefined;
  currency: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);
  const [salePrice, setSalePrice] = useState(listPrice != null ? String(listPrice / 100) : "");

  let parsed: number | null = null;
  try {
    parsed = parseMoneyToCents(salePrice);
  } catch {}
  const belowMin = parsed != null && minPrice != null && parsed < minPrice;

  function go(to: VehicleStatus) {
    if (to === "sold" && !selling) return setSelling(true);
    if (to === "sold" && parsed == null) return setError("Introduceți prețul final de vânzare.");
    if (to === "available" && status === "sold" && !confirm("Anulați vânzarea? Prețul final și data vânzării vor fi șterse.")) return;
    setError(null);
    start(async () => {
      const res = await changeStatusAction(vehicleId, to, to === "sold" ? salePrice : undefined);
      if (!res.ok) setError(res.error);
      else {
        setSelling(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <FormAlert>{error}</FormAlert>}
      {selling ? (
        <div className="space-y-3 rounded-lg border border-line bg-surface-2 p-3">
          <label className="label" htmlFor="salePrice">
            Preț final de vânzare
          </label>
          <div className="relative">
            <input
              id="salePrice"
              autoFocus
              inputMode="decimal"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="input tabular pr-12"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-muted">{currency}</span>
          </div>
          {belowMin && (
            <FormAlert tone="warn">
              Prețul este sub minimul acceptat ({formatMoney(minPrice!, currency)}). Doar proprietarul sau managerul poate confirma.
            </FormAlert>
          )}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={pending} onClick={() => go("sold")}>
              {pending ? "Se salvează…" : "Confirmă vânzarea"}
            </button>
            <button className="btn-ghost" onClick={() => setSelling(false)}>
              Renunță
            </button>
          </div>
        </div>
      ) : allowed.length ? (
        <div className="grid gap-2">
          {allowed.map((to) => (
            <button
              key={to}
              disabled={pending}
              onClick={() => go(to)}
              className={to === "sold" ? "btn-primary" : to === "withdrawn" ? "btn-ghost" : "btn-secondary"}
            >
              {status === "sold" && to === "available" ? "Anulează vânzarea" : ACTION_LABELS[to]}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted">Statusul {STATUS_LABELS[status]} nu poate fi modificat de rolul dumneavoastră.</p>
      )}
      {canDelete && status !== "sold" && (
        <button
          className="w-full pt-1 text-center text-[12.5px] text-muted hover:text-bad"
          disabled={pending}
          onClick={() => {
            if (!confirm("Ștergeți definitiv fișa și fotografiile? Acțiunea nu poate fi anulată.")) return;
            start(async () => {
              const res = await deleteVehicleAction(vehicleId);
              if (res && !res.ok) setError(res.error);
            });
          }}
        >
          Șterge fișa (introdusă greșit)
        </button>
      )}
    </div>
  );
}
