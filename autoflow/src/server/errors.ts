import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/permissions";

/** Eroare cu mesaj sigur de afișat utilizatorului. */
export class UserError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "UserError";
  }
}

export class NotFoundError extends UserError {
  constructor(what = "Înregistrarea") {
    super(`${what} nu a fost găsită.`);
    this.name = "NotFoundError";
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Transformă erorile în rezultat pentru interfață fără a expune detalii interne. */
export function toActionError(err: unknown): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Verificați câmpurile marcate.", fieldErrors };
  }
  if (err instanceof UserError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
  if (err instanceof ForbiddenError) return { ok: false, error: err.message };
  const pgCode = (err as { code?: string; cause?: { code?: string } })?.cause?.code ?? (err as { code?: string })?.code;
  if (pgCode === "23505") return { ok: false, error: "Există deja o înregistrare cu aceste date (ex. VIN duplicat)." };
  console.error("[autoflow] eroare neașteptată:", err);
  return { ok: false, error: "A apărut o eroare neașteptată. Încercați din nou." };
}
