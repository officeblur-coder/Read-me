import { can, type Role } from "./permissions";

export const VEHICLE_STATUSES = ["preparation", "available", "reserved", "sold", "withdrawn"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  preparation: "În pregătire",
  available: "Disponibil",
  reserved: "Rezervat",
  sold: "Vândut",
  withdrawn: "Retras",
};

/** Statusuri care înseamnă „mașina este încă în stoc”. */
export const IN_STOCK_STATUSES: VehicleStatus[] = ["preparation", "available", "reserved"];

const TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  preparation: ["available", "withdrawn"],
  available: ["preparation", "reserved", "sold", "withdrawn"],
  reserved: ["available", "sold", "withdrawn"],
  sold: ["available"], // anularea vânzării
  withdrawn: ["preparation", "available"],
};

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

export function checkTransition(
  role: Role,
  from: VehicleStatus,
  to: VehicleStatus,
  vehicle: { listPrice: number | null },
): TransitionCheck {
  if (from === to) return { ok: false, reason: "Autoturismul are deja acest status." };
  if (!TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `Tranziția ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]} nu este permisă.` };
  }
  if ((to === "reserved" || to === "sold") && !can(role, "vehicle.sell")) {
    return { ok: false, reason: "Doar agenții de vânzări și managerii pot rezerva sau vinde." };
  }
  if (from === "sold" && !can(role, "vehicle.sell.override")) {
    return { ok: false, reason: "Doar proprietarul sau managerul poate anula o vânzare." };
  }
  if (to === "withdrawn" && !can(role, "vehicle.delete")) {
    return { ok: false, reason: "Doar proprietarul sau managerul poate retrage un autoturism." };
  }
  if (to === "available" && vehicle.listPrice == null) {
    return { ok: false, reason: "Setați prețul de listare înainte de a marca autoturismul disponibil." };
  }
  return { ok: true };
}

export function allowedTransitions(role: Role, from: VehicleStatus, vehicle: { listPrice: number | null }) {
  return TRANSITIONS[from].filter((to) => checkTransition(role, from, to, vehicle).ok);
}
