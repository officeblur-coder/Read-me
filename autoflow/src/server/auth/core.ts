import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, withTenant } from "../db";
import { auditLog, dealers, locations, memberships, sessions, users } from "../db/schema";
import { ROLES, type Role } from "@/lib/permissions";

export const SESSION_TTL_DAYS = 30;
const BCRYPT_COST = 12;

export type AuthContext = {
  userId: string;
  dealerId: string;
  role: Role;
  user: { fullName: string; email: string };
  dealer: { name: string; slug: string; currency: string; status: string; planCode: string };
};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const passwordSchema = z
  .string()
  .min(10, "Parola trebuie să aibă cel puțin 10 caractere.")
  .max(200)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Parola trebuie să conțină litere și cifre.");

export const registerSchema = z.object({
  companyName: z.string().trim().min(2, "Introduceți numele parcului auto.").max(120),
  fullName: z.string().trim().min(2, "Introduceți numele complet.").max(120),
  email: z.email("Adresă de email invalidă.").trim().toLowerCase().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "dealer"
  );
}

/** Creează dealerul, utilizatorul Owner, punctul de lucru implicit și apartenența. */
export async function registerDealer(input: RegisterInput) {
  const data = registerSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
  const dealerId = randomUUID();

  const existing = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${data.email}`);
  if (existing.length) throw new AuthError("Există deja un cont cu această adresă de email.");

  const baseSlug = slugify(data.companyName);
  const slug = `${baseSlug}-${randomBytes(3).toString("hex")}`;

  return withTenant({ dealerId, userId: null }, async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: data.email, passwordHash, fullName: data.fullName, phone: data.phone || null })
      .returning({ id: users.id });
    await tx.insert(dealers).values({
      id: dealerId,
      name: data.companyName,
      slug,
      email: data.email,
      phone: data.phone || null,
    });
    const [location] = await tx
      .insert(locations)
      .values({ dealerId, name: "Sediu principal", isDefault: true })
      .returning({ id: locations.id });
    await tx.insert(memberships).values({ dealerId, userId: user.id, role: "owner", locationId: location.id });
    await tx.insert(auditLog).values({
      dealerId,
      actorUserId: user.id,
      action: "dealer.registered",
      entity: "dealer",
      entityId: dealerId,
    });
    return { userId: user.id, dealerId };
  });
}

// Hash folosit când emailul nu există, ca timpul de răspuns să nu dezvăluie existența contului.
const DUMMY_HASH = bcrypt.hashSync("autoflow-dummy-password", BCRYPT_COST);

export async function verifyCredentials(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || user.disabledAt) return null;

  const userMemberships = await withTenant({ dealerId: null, userId: user.id }, (tx) =>
    tx
      .select({ dealerId: memberships.dealerId, createdAt: memberships.createdAt })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .orderBy(memberships.createdAt),
  );
  return { userId: user.id, dealerId: userMemberships[0]?.dealerId ?? null };
}

export async function createSession(
  userId: string,
  dealerId: string | null,
  meta: { ip?: string | null; userAgent?: string | null } = {},
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    activeDealerId: dealerId,
    expiresAt,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
  });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

/** Validează token-ul și întoarce contextul complet, sau null dacă sesiunea nu mai este validă. */
export async function resolveSession(token: string): Promise<AuthContext | null> {
  const id = hashToken(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id));
  if (!row) return null;
  const { session, user } = row;
  if (session.expiresAt < new Date() || user.disabledAt || !session.activeDealerId) {
    if (session.expiresAt < new Date()) await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  const dealerId = session.activeDealerId;
  const tenant = await withTenant({ dealerId, userId: user.id }, async (tx) => {
    const [m] = await tx
      .select({ role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.dealerId, dealerId), eq(memberships.userId, user.id)));
    const [d] = await tx.select().from(dealers).where(eq(dealers.id, dealerId));
    return m && d ? { role: m.role, dealer: d } : null;
  });
  // Apartenența a fost revocată sau dealerul a fost suspendat: accesul încetează imediat.
  if (!tenant || !ROLES.includes(tenant.role as Role)) return null;
  if (tenant.dealer.status === "suspended" || tenant.dealer.status === "cancelled") return null;

  // Prelungire glisantă a sesiunii active.
  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining < (SESSION_TTL_DAYS / 2) * 86_400_000) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000) })
      .where(eq(sessions.id, id));
  }

  return {
    userId: user.id,
    dealerId,
    role: tenant.role as Role,
    user: { fullName: user.fullName, email: user.email },
    dealer: {
      name: tenant.dealer.name,
      slug: tenant.dealer.slug,
      currency: tenant.dealer.currency,
      status: tenant.dealer.status,
      planCode: tenant.dealer.planCode,
    },
  };
}
