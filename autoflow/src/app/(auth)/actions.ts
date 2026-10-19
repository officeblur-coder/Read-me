"use server";

import { redirect } from "next/navigation";
import { AuthError, createSession, deleteSession, registerDealer, verifyCredentials } from "@/server/auth/core";
import { rateLimit, resetRateLimit } from "@/server/auth/rate-limit";
import { clearSessionCookie, requestMeta, setSessionCookie, SESSION_COOKIE } from "@/server/auth/session";
import { toActionError } from "@/server/errors";
import { cookies } from "next/headers";

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> };

export async function loginAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const meta = await requestMeta();
  if (!email || !password) return { error: "Introduceți emailul și parola.", values: { email } };

  const key = `login:${meta.ip}:${email}`;
  const limit = rateLimit(key, 8, 15 * 60_000);
  if (!limit.ok) {
    return { error: `Prea multe încercări. Reîncercați în ${Math.ceil(limit.retryAfterSec / 60)} minute.`, values: { email } };
  }
  const cred = await verifyCredentials(email, password);
  if (!cred) return { error: "Email sau parolă incorectă.", values: { email } };
  if (!cred.dealerId) return { error: "Contul nu este asociat niciunui parc auto activ.", values: { email } };

  resetRateLimit(key);
  const { token, expiresAt } = await createSession(cred.userId, cred.dealerId, meta);
  await setSessionCookie(token, expiresAt);
  redirect("/dashboard");
}

export async function registerAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const values = {
    companyName: String(fd.get("companyName") ?? ""),
    fullName: String(fd.get("fullName") ?? ""),
    email: String(fd.get("email") ?? ""),
    phone: String(fd.get("phone") ?? ""),
  };
  const meta = await requestMeta();
  if (!rateLimit(`register:${meta.ip}`, 5, 60 * 60_000).ok) {
    return { error: "Prea multe înregistrări de la această adresă. Reîncercați mai târziu.", values };
  }
  if (fd.get("terms") !== "on") {
    return { fieldErrors: { terms: "Acceptați termenii pentru a continua." }, values };
  }
  let ids;
  try {
    ids = await registerDealer({ ...values, password: String(fd.get("password") ?? "") });
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message, values };
    const r = toActionError(err);
    return { error: r.error, fieldErrors: r.fieldErrors, values };
  }
  const { token, expiresAt } = await createSession(ids.userId, ids.dealerId, meta);
  await setSessionCookie(token, expiresAt);
  redirect("/dashboard");
}

export async function logoutAction() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  await clearSessionCookie();
  redirect("/login");
}
