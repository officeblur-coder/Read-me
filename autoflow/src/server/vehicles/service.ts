import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { AuthContext } from "../auth/core";
import { withTenant } from "../db";
import { dealers, users, vehicleMedia, vehicles, vehicleStatusHistory, type VehicleRow } from "../db/schema";
import { audit } from "../audit";
import { NotFoundError, UserError } from "../errors";
import { assertCan, can, type Role } from "@/lib/permissions";
import { checkTransition, VEHICLE_STATUSES, type VehicleStatus } from "@/lib/vehicle-status";
import { estimatedGrossProfit, realizedGrossProfit, totalCost } from "@/lib/finance";
import { PROTECTED_FIELDS, vehicleInputSchema, type VehicleInput } from "./schema";

type Ctx = Pick<AuthContext, "dealerId" | "userId" | "role">;

const COST_FIELDS = ["purchasePrice", "transportCost", "repairCost", "preparationCost", "otherCosts"] as const;

/** Vederea unui autoturism, cu câmpurile financiare eliminate conform rolului. */
export type VehicleView = Omit<VehicleRow, (typeof COST_FIELDS)[number] | "minPrice" | "salePrice"> & {
  purchasePrice?: number | null;
  transportCost?: number | null;
  repairCost?: number | null;
  preparationCost?: number | null;
  otherCosts?: number | null;
  minPrice?: number | null;
  salePrice?: number | null;
  totalCost?: number | null;
  estimatedProfit?: number | null;
  realizedProfit?: number | null;
};

export function toVehicleView(row: VehicleRow, role: Role): VehicleView {
  const { purchasePrice, transportCost, repairCost, preparationCost, otherCosts, minPrice, salePrice, ...rest } = row;
  const view: VehicleView = { ...rest, salePrice };
  if (can(role, "vehicle.minPrice.read")) view.minPrice = minPrice;
  if (can(role, "vehicle.costs.read")) {
    Object.assign(view, { purchasePrice, transportCost, repairCost, preparationCost, otherCosts });
    view.totalCost = totalCost(row);
    view.estimatedProfit = estimatedGrossProfit(row);
    view.realizedProfit = realizedGrossProfit(row);
  }
  return view;
}

/** Elimină câmpurile pe care rolul nu le poate scrie (nu le setează la null). */
type ProtectedField = keyof typeof PROTECTED_FIELDS;
function writableFields(input: VehicleInput, role: Role) {
  const data: Omit<VehicleInput, ProtectedField> & Partial<Pick<VehicleInput, ProtectedField>> = { ...input };
  for (const [field, perm] of Object.entries(PROTECTED_FIELDS)) {
    if (!can(role, perm)) delete data[field as ProtectedField];
  }
  return data;
}

export async function createVehicle(ctx: Ctx, raw: unknown) {
  assertCan(ctx.role, "vehicle.create");
  const input = vehicleInputSchema.parse(raw);
  const data = writableFields(input, ctx.role);
  return withTenant(ctx, async (tx) => {
    const [{ seq }] = await tx
      .update(dealers)
      .set({ stockSeq: sql`${dealers.stockSeq} + 1` })
      .where(eq(dealers.id, ctx.dealerId))
      .returning({ seq: dealers.stockSeq });
    const [row] = await tx
      .insert(vehicles)
      .values({
        ...data,
        acquiredAt: data.acquiredAt ?? new Date().toISOString().slice(0, 10),
        dealerId: ctx.dealerId,
        stockNumber: seq,
        createdByUserId: ctx.userId,
        status: "preparation",
      })
      .returning();
    await tx.insert(vehicleStatusHistory).values({
      dealerId: ctx.dealerId,
      vehicleId: row.id,
      fromStatus: null,
      toStatus: "preparation",
      userId: ctx.userId,
    });
    await audit(tx, ctx, "vehicle.created", "vehicle", row.id, { stockNumber: seq });
    return row;
  });
}

export async function updateVehicle(ctx: Ctx, id: string, raw: unknown) {
  assertCan(ctx.role, "vehicle.update");
  const input = vehicleInputSchema.parse(raw);
  const data = writableFields(input, ctx.role);
  return withTenant(ctx, async (tx) => {
    const [before] = await tx
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.dealerId, ctx.dealerId)))
      .for("update");
    if (!before) throw new NotFoundError("Autoturismul");
    if (before.status === "available" && "listPrice" in data && data.listPrice == null) {
      throw new UserError("Un autoturism disponibil trebuie să aibă preț de listare.", {
        listPrice: "Prețul de listare este obligatoriu pentru statusul Disponibil.",
      });
    }
    const [row] = await tx
      .update(vehicles)
      .set({ ...data, acquiredAt: data.acquiredAt ?? before.acquiredAt, updatedAt: new Date() })
      .where(and(eq(vehicles.id, id), eq(vehicles.dealerId, ctx.dealerId)))
      .returning();
    const changed = Object.keys(data).filter(
      (k) => JSON.stringify(before[k as keyof VehicleRow]) !== JSON.stringify(row[k as keyof VehicleRow]),
    );
    if (changed.length) await audit(tx, ctx, "vehicle.updated", "vehicle", id, { fields: changed });
    return row;
  });
}

export async function changeVehicleStatus(
  ctx: Ctx,
  id: string,
  to: VehicleStatus,
  opts: { salePrice?: number | null } = {},
) {
  if (!VEHICLE_STATUSES.includes(to)) throw new UserError("Status invalid.");
  return withTenant(ctx, async (tx) => {
    const [v] = await tx
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.dealerId, ctx.dealerId)))
      .for("update");
    if (!v) throw new NotFoundError("Autoturismul");
    const from = v.status as VehicleStatus;
    const check = checkTransition(ctx.role, from, to, v);
    if (!check.ok) throw new UserError(check.reason);

    const now = new Date();
    const patch: Partial<VehicleRow> = { status: to, statusChangedAt: now, updatedAt: now };
    if (to === "sold") {
      if (opts.salePrice == null) throw new UserError("Introduceți prețul final de vânzare.");
      if (v.minPrice != null && opts.salePrice < v.minPrice && !can(ctx.role, "vehicle.sell.override")) {
        throw new UserError("Prețul final este sub prețul minim acceptat. Este necesară aprobarea unui manager.");
      }
      Object.assign(patch, { salePrice: opts.salePrice, soldAt: now, soldByUserId: ctx.userId });
    }
    if (from === "sold") Object.assign(patch, { salePrice: null, soldAt: null, soldByUserId: null });
    if (to === "available" && !v.listedAt) patch.listedAt = now;

    const [row] = await tx.update(vehicles).set(patch).where(eq(vehicles.id, id)).returning();
    await tx.insert(vehicleStatusHistory).values({
      dealerId: ctx.dealerId,
      vehicleId: id,
      fromStatus: from,
      toStatus: to,
      userId: ctx.userId,
    });
    await audit(tx, ctx, "vehicle.status_changed", "vehicle", id, {
      from,
      to,
      ...(to === "sold" ? { salePrice: opts.salePrice, belowMinPrice: v.minPrice != null && opts.salePrice! < v.minPrice } : {}),
    });
    return row;
  });
}

/** Ștergere definitivă — doar pentru fișe introduse greșit; vânzările se păstrează. */
export async function deleteVehicle(ctx: Ctx, id: string) {
  assertCan(ctx.role, "vehicle.delete");
  return withTenant(ctx, async (tx) => {
    const [v] = await tx
      .select({ status: vehicles.status, stockNumber: vehicles.stockNumber })
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.dealerId, ctx.dealerId)));
    if (!v) throw new NotFoundError("Autoturismul");
    if (v.status === "sold") throw new UserError("Un autoturism vândut nu poate fi șters (istoric financiar).");
    const media = await tx
      .select({ storageKey: vehicleMedia.storageKey, thumbKey: vehicleMedia.thumbKey })
      .from(vehicleMedia)
      .where(eq(vehicleMedia.vehicleId, id));
    await tx.delete(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.dealerId, ctx.dealerId)));
    await audit(tx, ctx, "vehicle.deleted", "vehicle", id, { stockNumber: v.stockNumber });
    return media.flatMap((m) => [m.storageKey, m.thumbKey].filter(Boolean) as string[]);
  });
}

// ── Citiri ──────────────────────────────────────────────────────────────────

export type VehicleFilters = {
  q?: string;
  status?: string;
  make?: string;
  fuel?: string;
  transmission?: string;
  sort?: string;
  page?: number;
};

export const PAGE_SIZE = 25;

const SORTS: Record<string, SQL> = {
  newest: desc(vehicles.createdAt),
  oldest: asc(vehicles.acquiredAt),
  price_asc: sql`${vehicles.listPrice} asc nulls last`,
  price_desc: sql`${vehicles.listPrice} desc nulls last`,
  year_desc: desc(vehicles.year),
  mileage_asc: sql`${vehicles.mileageKm} asc nulls last`,
};

export async function listVehicles(ctx: Ctx, f: VehicleFilters) {
  assertCan(ctx.role, "vehicle.read");
  const conds: SQL[] = [eq(vehicles.dealerId, ctx.dealerId)];
  if (f.status === "in_stock") conds.push(inArray(vehicles.status, ["preparation", "available", "reserved"]));
  else if (f.status && VEHICLE_STATUSES.includes(f.status as VehicleStatus)) conds.push(eq(vehicles.status, f.status));
  if (f.make) conds.push(eq(vehicles.make, f.make));
  if (f.fuel) conds.push(eq(vehicles.fuel, f.fuel));
  if (f.transmission) conds.push(eq(vehicles.transmission, f.transmission));
  const q = f.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    const searchConds = [
      ilike(vehicles.make, like),
      ilike(vehicles.model, like),
      ilike(vehicles.vin, like),
      ilike(vehicles.plateNumber, like),
      ilike(sql`${vehicles.make} || ' ' || ${vehicles.model}`, like),
    ];
    const stock = q.toUpperCase().replace(/^AF-?/, "");
    if (/^\d{1,9}$/.test(stock)) searchConds.push(eq(vehicles.stockNumber, Number(stock)));
    conds.push(or(...searchConds)!);
  }
  const page = Math.max(1, f.page ?? 1);
  const where = and(...conds);

  return withTenant(ctx, async (tx) => {
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(vehicles).where(where);
    const rows = await tx
      .select({
        vehicle: vehicles,
        photoId: sql<string | null>`(select m.id from vehicle_media m where m.vehicle_id = ${vehicles.id} and m.kind = 'image' order by m.is_primary desc, m.position asc limit 1)`,
        photoCount: sql<number>`(select count(*)::int from vehicle_media m where m.vehicle_id = ${vehicles.id})`,
      })
      .from(vehicles)
      .where(where)
      .orderBy(SORTS[f.sort ?? ""] ?? SORTS.newest, desc(vehicles.stockNumber))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    const makes = await tx
      .selectDistinct({ make: vehicles.make })
      .from(vehicles)
      .where(eq(vehicles.dealerId, ctx.dealerId))
      .orderBy(vehicles.make);
    return {
      total: count,
      page,
      pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)),
      items: rows.map((r) => ({ ...toVehicleView(r.vehicle, ctx.role), photoId: r.photoId, photoCount: r.photoCount })),
      makes: makes.map((m) => m.make),
    };
  });
}

export async function getVehicle(ctx: Ctx, id: string) {
  assertCan(ctx.role, "vehicle.read");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundError("Autoturismul");
  return withTenant(ctx, async (tx) => {
    const [row] = await tx
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.dealerId, ctx.dealerId)));
    if (!row) throw new NotFoundError("Autoturismul");
    const media = await tx
      .select()
      .from(vehicleMedia)
      .where(eq(vehicleMedia.vehicleId, id))
      .orderBy(desc(vehicleMedia.isPrimary), asc(vehicleMedia.position), asc(vehicleMedia.createdAt));
    const history = await tx
      .select({
        id: vehicleStatusHistory.id,
        fromStatus: vehicleStatusHistory.fromStatus,
        toStatus: vehicleStatusHistory.toStatus,
        createdAt: vehicleStatusHistory.createdAt,
        userName: users.fullName,
      })
      .from(vehicleStatusHistory)
      .leftJoin(users, eq(users.id, vehicleStatusHistory.userId))
      .where(eq(vehicleStatusHistory.vehicleId, id))
      .orderBy(desc(vehicleStatusHistory.createdAt));
    let soldByName: string | null = null;
    if (row.soldByUserId) {
      const [u] = await tx.select({ n: users.fullName }).from(users).where(eq(users.id, row.soldByUserId));
      soldByName = u?.n ?? null;
    }
    return { vehicle: toVehicleView(row, ctx.role), media, history, soldByName };
  });
}
