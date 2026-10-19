import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { and, asc, eq, sql } from "drizzle-orm";
import { withTenant } from "../db";
import { vehicleMedia, vehicles } from "../db/schema";
import { audit } from "../audit";
import { NotFoundError, UserError } from "../errors";
import { assertCan } from "@/lib/permissions";
import type { AuthContext } from "../auth/core";
import { storage } from "./storage";

type Ctx = Pick<AuthContext, "dealerId" | "userId" | "role">;

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTOS_PER_VEHICLE = 40;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/** Redimensionează, corectează orientarea, elimină metadatele EXIF/GPS și convertește în WebP. */
export async function processImage(input: Buffer) {
  const base = sharp(input, { failOn: "error" }).rotate();
  const full = await base
    .clone()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 480, height: 360, fit: "cover" })
    .webp({ quality: 75 })
    .toBuffer();
  return { full: full.data, width: full.info.width, height: full.info.height, thumb };
}

export async function uploadVehiclePhotos(ctx: Ctx, vehicleId: string, files: File[]) {
  assertCan(ctx.role, "media.write");
  if (!files.length) throw new UserError("Selectați cel puțin o fotografie.");
  for (const f of files) {
    if (!ACCEPTED.has(f.type)) throw new UserError(`Format neacceptat: ${f.name}. Folosiți JPG, PNG, WebP sau AVIF.`);
    if (f.size > MAX_PHOTO_BYTES) throw new UserError(`${f.name} depășește 15 MB.`);
  }

  const existing = await withTenant(ctx, async (tx) => {
    const [v] = await tx
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.dealerId, ctx.dealerId)));
    if (!v) throw new NotFoundError("Autoturismul");
    const [{ count, maxPos }] = await tx
      .select({ count: sql<number>`count(*)::int`, maxPos: sql<number>`coalesce(max(position), -1)::int` })
      .from(vehicleMedia)
      .where(eq(vehicleMedia.vehicleId, vehicleId));
    return { count, maxPos };
  });
  if (existing.count + files.length > MAX_PHOTOS_PER_VEHICLE) {
    throw new UserError(`Maximum ${MAX_PHOTOS_PER_VEHICLE} fotografii per autoturism.`);
  }

  // Procesarea imaginilor se face în afara tranzacției (poate dura).
  const processed: { key: string; thumbKey: string; size: number; width: number; height: number }[] = [];
  const written: string[] = [];
  try {
    for (const f of files) {
      let img;
      try {
        img = await processImage(Buffer.from(await f.arrayBuffer()));
      } catch {
        throw new UserError(`Fișierul ${f.name} nu este o imagine validă.`);
      }
      const id = randomUUID();
      const key = `${ctx.dealerId}/${vehicleId}/${id}.webp`;
      const thumbKey = `${ctx.dealerId}/${vehicleId}/${id}_thumb.webp`;
      await storage().put(key, img.full, "image/webp");
      written.push(key);
      await storage().put(thumbKey, img.thumb, "image/webp");
      written.push(thumbKey);
      processed.push({ key, thumbKey, size: img.full.length, width: img.width, height: img.height });
    }

    return await withTenant(ctx, async (tx) => {
      const [{ hasPrimary }] = await tx
        .select({ hasPrimary: sql<boolean>`bool_or(is_primary)` })
        .from(vehicleMedia)
        .where(eq(vehicleMedia.vehicleId, vehicleId));
      const rows = await tx
        .insert(vehicleMedia)
        .values(
          processed.map((p, i) => ({
            dealerId: ctx.dealerId,
            vehicleId,
            kind: "image",
            storageKey: p.key,
            thumbKey: p.thumbKey,
            mimeType: "image/webp",
            width: p.width,
            height: p.height,
            sizeBytes: p.size,
            position: existing.maxPos + 1 + i,
            isPrimary: !hasPrimary && i === 0,
          })),
        )
        .returning({ id: vehicleMedia.id });
      await audit(tx, ctx, "media.uploaded", "vehicle", vehicleId, { count: rows.length });
      return rows;
    });
  } catch (err) {
    await storage().remove(written);
    throw err;
  }
}

export async function reorderVehiclePhotos(ctx: Ctx, vehicleId: string, orderedIds: string[]) {
  assertCan(ctx.role, "media.write");
  await withTenant(ctx, async (tx) => {
    const current = await tx
      .select({ id: vehicleMedia.id })
      .from(vehicleMedia)
      .where(and(eq(vehicleMedia.vehicleId, vehicleId), eq(vehicleMedia.dealerId, ctx.dealerId)));
    const known = new Set(current.map((m) => m.id));
    if (orderedIds.length !== known.size || !orderedIds.every((id) => known.has(id))) {
      throw new UserError("Lista de fotografii s-a modificat. Reîncărcați pagina.");
    }
    for (const [i, id] of orderedIds.entries()) {
      await tx.update(vehicleMedia).set({ position: i }).where(eq(vehicleMedia.id, id));
    }
  });
}

export async function setPrimaryPhoto(ctx: Ctx, vehicleId: string, mediaId: string) {
  assertCan(ctx.role, "media.write");
  await withTenant(ctx, async (tx) => {
    const [m] = await tx
      .select({ id: vehicleMedia.id })
      .from(vehicleMedia)
      .where(and(eq(vehicleMedia.id, mediaId), eq(vehicleMedia.vehicleId, vehicleId), eq(vehicleMedia.dealerId, ctx.dealerId)));
    if (!m) throw new NotFoundError("Fotografia");
    await tx.update(vehicleMedia).set({ isPrimary: false }).where(eq(vehicleMedia.vehicleId, vehicleId));
    await tx.update(vehicleMedia).set({ isPrimary: true }).where(eq(vehicleMedia.id, mediaId));
  });
}

export async function deletePhoto(ctx: Ctx, vehicleId: string, mediaId: string) {
  assertCan(ctx.role, "media.write");
  const keys = await withTenant(ctx, async (tx) => {
    const [m] = await tx
      .select()
      .from(vehicleMedia)
      .where(and(eq(vehicleMedia.id, mediaId), eq(vehicleMedia.vehicleId, vehicleId), eq(vehicleMedia.dealerId, ctx.dealerId)));
    if (!m) throw new NotFoundError("Fotografia");
    await tx.delete(vehicleMedia).where(eq(vehicleMedia.id, mediaId));
    if (m.isPrimary) {
      const [next] = await tx
        .select({ id: vehicleMedia.id })
        .from(vehicleMedia)
        .where(eq(vehicleMedia.vehicleId, vehicleId))
        .orderBy(asc(vehicleMedia.position))
        .limit(1);
      if (next) await tx.update(vehicleMedia).set({ isPrimary: true }).where(eq(vehicleMedia.id, next.id));
    }
    await audit(tx, ctx, "media.deleted", "vehicle", vehicleId, { mediaId });
    return [m.storageKey, m.thumbKey].filter(Boolean) as string[];
  });
  await storage().remove(keys);
}

/** Citește fișierul unei fotografii, doar dacă aparține dealerului din sesiune. */
export async function readPhoto(ctx: Ctx, mediaId: string, size: "full" | "thumb") {
  if (!/^[0-9a-f-]{36}$/i.test(mediaId)) return null;
  const m = await withTenant(ctx, async (tx) => {
    const [row] = await tx
      .select({ storageKey: vehicleMedia.storageKey, thumbKey: vehicleMedia.thumbKey, mimeType: vehicleMedia.mimeType })
      .from(vehicleMedia)
      .where(and(eq(vehicleMedia.id, mediaId), eq(vehicleMedia.dealerId, ctx.dealerId)));
    return row;
  });
  if (!m) return null;
  const data = await storage().get(size === "thumb" && m.thumbKey ? m.thumbKey : m.storageKey);
  return data ? { data, mimeType: m.mimeType } : null;
}
