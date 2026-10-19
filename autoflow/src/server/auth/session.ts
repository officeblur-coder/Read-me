import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertCan, type Permission } from "@/lib/permissions";
import { resolveSession, type AuthContext } from "./core";

export const SESSION_COOKIE = "af_session";

export const getCurrentContext = cache(async (): Promise<AuthContext | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolveSession(token);
});

/** Pentru pagini: redirecționează la login dacă nu există sesiune validă. */
export async function requireContext(): Promise<AuthContext> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Pentru acțiuni de server: aruncă eroare dacă lipsește sesiunea sau permisiunea. */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const ctx = await getCurrentContext();
  if (!ctx) throw new Error("Sesiunea a expirat. Autentificați-vă din nou.");
  assertCan(ctx.role, permission);
  return ctx;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent"),
  };
}
