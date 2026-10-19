"use client";

import { useActionState } from "react";
import { registerAction, type AuthState } from "../actions";
import { Field, FormAlert, inputClass } from "@/components/ui/field";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="mt-8 space-y-4">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <Field label="Numele parcului auto" name="companyName" error={fe.companyName}>
        <input id="companyName" name="companyName" required defaultValue={v.companyName} className={inputClass(fe.companyName)} />
      </Field>
      <Field label="Numele dumneavoastră" name="fullName" error={fe.fullName}>
        <input id="fullName" name="fullName" autoComplete="name" required defaultValue={v.fullName} className={inputClass(fe.fullName)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" name="email" error={fe.email}>
          <input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} className={inputClass(fe.email)} />
        </Field>
        <Field label="Telefon" name="phone" error={fe.phone}>
          <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} className={inputClass(fe.phone)} />
        </Field>
      </div>
      <Field label="Parolă" name="password" error={fe.password} hint="Minimum 10 caractere, cu litere și cifre.">
        <input id="password" name="password" type="password" autoComplete="new-password" required className={inputClass(fe.password)} />
      </Field>
      <label className="flex items-start gap-2.5 text-[13px] text-fg-2">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>
          Accept termenii de utilizare și politica de confidențialitate AUTOFLOW.
          {fe.terms && <span className="block text-bad">{fe.terms}</span>}
        </span>
      </label>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Se creează contul…" : "Creează contul"}
      </button>
    </form>
  );
}
