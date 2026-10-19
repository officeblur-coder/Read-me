"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/session";
import { toActionError, type ActionResult } from "@/server/errors";
import { addTeamMember, changeMemberRole, removeMember, updateCompany } from "@/server/company/service";

export type FormState = ActionResult & { values?: Record<string, string> };

export async function updateCompanyAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
  try {
    const ctx = await requirePermission("company.update");
    await updateCompany(ctx, values);
  } catch (err) {
    return { ...toActionError(err), values };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Datele companiei au fost salvate.", values };
}

export async function addMemberAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
  try {
    const ctx = await requirePermission("users.manage");
    await addTeamMember(ctx, values);
  } catch (err) {
    const { password: _p, ...safe } = values;
    return { ...toActionError(err), values: safe };
  }
  revalidatePath("/settings/users");
  return { ok: true, message: `${values.fullName} a fost adăugat. Comunicați-i parola inițială pe un canal sigur.` };
}

export async function changeRoleAction(userId: string, role: string): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("users.manage");
    await changeMemberRole(ctx, userId, role);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/settings/users");
  return { ok: true };
}

export async function removeMemberAction(userId: string): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("users.manage");
    await removeMember(ctx, userId);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/settings/users");
  return { ok: true };
}
