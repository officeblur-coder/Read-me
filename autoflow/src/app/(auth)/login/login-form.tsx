"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "../actions";
import { Field, FormAlert } from "@/components/ui/field";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-8 space-y-4">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <Field label="Email" name="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          className="input"
        />
      </Field>
      <Field label="Parolă" name="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Se verifică…" : "Intră în cont"}
      </button>
    </form>
  );
}
