"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/auth/session";
import { toActionError, type ActionResult } from "@/server/errors";
import { formDataToVehicleInput } from "@/server/vehicles/schema";
import { changeVehicleStatus, createVehicle, deleteVehicle, updateVehicle } from "@/server/vehicles/service";
import { deletePhoto, reorderVehiclePhotos, setPrimaryPhoto, uploadVehiclePhotos } from "@/server/media/service";
import { storage } from "@/server/media/storage";
import { parseMoneyToCents } from "@/lib/finance";
import type { VehicleStatus } from "@/lib/vehicle-status";

export type VehicleFormState = ActionResult & { values?: Record<string, unknown> };

export async function saveVehicleAction(vehicleId: string | null, _: VehicleFormState, fd: FormData): Promise<VehicleFormState> {
  const raw = formDataToVehicleInput(fd);
  let id = vehicleId;
  try {
    if (vehicleId) {
      const ctx = await requirePermission("vehicle.update");
      await updateVehicle(ctx, vehicleId, raw);
    } else {
      const ctx = await requirePermission("vehicle.create");
      id = (await createVehicle(ctx, raw)).id;
    }
  } catch (err) {
    return { ...toActionError(err), values: raw };
  }
  revalidatePath("/vehicles");
  revalidatePath("/dashboard");
  redirect(`/vehicles/${id}${vehicleId ? "" : "?created=1"}`);
}

export async function changeStatusAction(vehicleId: string, to: VehicleStatus, salePriceInput?: string): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("vehicle.read");
    let salePrice: number | null = null;
    if (to === "sold") {
      try {
        salePrice = parseMoneyToCents(salePriceInput);
      } catch {
        return { ok: false, error: "Preț de vânzare invalid." };
      }
    }
    await changeVehicleStatus(ctx, vehicleId, to, { salePrice });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath("/vehicles");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteVehicleAction(vehicleId: string): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("vehicle.delete");
    const keys = await deleteVehicle(ctx, vehicleId);
    await storage().remove(keys);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/vehicles");
  revalidatePath("/dashboard");
  redirect("/vehicles");
}

export async function uploadPhotosAction(vehicleId: string, fd: FormData): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("media.write");
    const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    await uploadVehiclePhotos(ctx, vehicleId, files);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true };
}

export async function reorderPhotosAction(vehicleId: string, ids: string[]): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("media.write");
    await reorderVehiclePhotos(ctx, vehicleId, ids);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true };
}

export async function setPrimaryPhotoAction(vehicleId: string, mediaId: string): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("media.write");
    await setPrimaryPhoto(ctx, vehicleId, mediaId);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true };
}

export async function deletePhotoAction(vehicleId: string, mediaId: string): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("media.write");
    await deletePhoto(ctx, vehicleId, mediaId);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/vehicles/${vehicleId}`);
  return { ok: true };
}
