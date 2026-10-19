import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { withTenant } from "../db";
import { dealers, memberships, users } from "../db/schema";
import { audit } from "../audit";
import { assertCan, ROLES } from "@/lib/permissions";
import { passwordSchema } from "../auth/core";
import { UserError } from "../errors";
import type { AuthContext } from "../auth/core";

type Ctx = Pick<AuthContext, "dealerId" | "userId" | "role">;

const opt = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable());

export const companySchema = z.object({
  name: z.string().trim().min(2, "Numele este obligatoriu.").max(120),
  legalName: opt(160),
  cui: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim().toUpperCase().replace(/\s/g, "") : v),
    z.string().regex(/^(RO)?\d{2,10}$/, "CUI invalid (ex. RO12345678).").nullable(),
  ),
  regCom: opt(40),
  address: opt(200),
  city: opt(80),
  county: opt(80),
  phone: opt(40),
  email: z.preprocess((v) => (v === "" ? null : v), z.email("Email invalid.").nullable()),
  website: z.preprocess((v) => (v === "" ? null : v), z.url("Adresă web invalidă (ex. https://…).").nullable()),
  brandColor: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().regex(/^#[0-9a-fA-F]{6}$/, "Culoare invalidă.").nullable(),
  ),
});

export async function getCompany(ctx: Ctx) {
  assertCan(ctx.role, "company.read");
  return withTenant(ctx, async (tx) => {
    const [d] = await tx.select().from(dealers).where(eq(dealers.id, ctx.dealerId));
    return d;
  });
}

export async function updateCompany(ctx: Ctx, raw: unknown) {
  assertCan(ctx.role, "company.update");
  const data = companySchema.parse(raw);
  return withTenant(ctx, async (tx) => {
    await tx.update(dealers).set({ ...data, updatedAt: new Date() }).where(eq(dealers.id, ctx.dealerId));
    await audit(tx, ctx, "company.updated", "dealer", ctx.dealerId, { fields: Object.keys(data) });
  });
}

export async function listTeam(ctx: Ctx) {
  assertCan(ctx.role, "users.read");
  return withTenant(ctx, (tx) =>
    tx
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: memberships.role,
        lastLoginAt: users.lastLoginAt,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.dealerId, ctx.dealerId))
      .orderBy(asc(memberships.createdAt)),
  );
}

export const memberSchema = z.object({
  fullName: z.string().trim().min(2, "Introduceți numele.").max(120),
  email: z.email("Email invalid.").trim().toLowerCase(),
  role: z.enum(ROLES.filter((r) => r !== "owner") as [string, ...string[]], { error: "Rol invalid." }),
  password: passwordSchema,
});

/**
 * Adaugă un membru cu parolă inițială comunicată de proprietar.
 * Invitațiile prin email (cu link de setare a parolei) vor înlocui acest flux când furnizorul de email este configurat.
 */
export async function addTeamMember(ctx: Ctx, raw: unknown) {
  assertCan(ctx.role, "users.manage");
  const data = memberSchema.parse(raw);
  const passwordHash = await bcrypt.hash(data.password, 12);
  return withTenant(ctx, async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${data.email}`);
    if (existing) throw new UserError("Există deja un utilizator cu acest email.", { email: "Email folosit deja." });
    const [u] = await tx
      .insert(users)
      .values({ email: data.email, fullName: data.fullName, passwordHash })
      .returning({ id: users.id });
    await tx.insert(memberships).values({ dealerId: ctx.dealerId, userId: u.id, role: data.role });
    await audit(tx, ctx, "member.added", "user", u.id, { role: data.role });
    return u;
  });
}

export async function changeMemberRole(ctx: Ctx, userId: string, role: string) {
  assertCan(ctx.role, "users.manage");
  if (!ROLES.includes(role as never) || role === "owner") throw new UserError("Rol invalid.");
  if (userId === ctx.userId) throw new UserError("Nu vă puteți schimba propriul rol.");
  await withTenant(ctx, async (tx) => {
    const [m] = await tx
      .update(memberships)
      .set({ role })
      .where(and(eq(memberships.dealerId, ctx.dealerId), eq(memberships.userId, userId), sql`${memberships.role} <> 'owner'`))
      .returning({ id: memberships.id });
    if (!m) throw new UserError("Membrul nu a fost găsit sau este proprietar.");
    await audit(tx, ctx, "member.role_changed", "user", userId, { role });
  });
}

export async function removeMember(ctx: Ctx, userId: string) {
  assertCan(ctx.role, "users.manage");
  if (userId === ctx.userId) throw new UserError("Nu vă puteți elimina propriul cont.");
  await withTenant(ctx, async (tx) => {
    const [m] = await tx
      .delete(memberships)
      .where(and(eq(memberships.dealerId, ctx.dealerId), eq(memberships.userId, userId), sql`${memberships.role} <> 'owner'`))
      .returning({ id: memberships.id });
    if (!m) throw new UserError("Membrul nu a fost găsit sau este proprietar.");
    // Sesiunile active pe acest dealer devin invalide imediat (resolveSession verifică apartenența).
    await audit(tx, ctx, "member.removed", "user", userId);
  });
}
