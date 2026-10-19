"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { addMemberAction, changeRoleAction, removeMemberAction, type FormState } from "../actions";
import { Field, FormAlert, inputClass } from "@/components/ui/field";
import { ROLE_LABELS } from "@/lib/permissions";

export function AddMemberForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addMemberAction, { ok: true });
  const fe = (!state.ok && state.fieldErrors) || {};
  const v = (!state.ok && state.values) || {};
  return (
    <form action={action} key={state.ok ? state.message : "err"} className="card space-y-4 p-5">
      <h2 className="text-[14.5px] font-semibold">Adaugă utilizator</h2>
      {!state.ok && <FormAlert>{state.error}</FormAlert>}
      {state.ok && state.message && <FormAlert tone="good">{state.message}</FormAlert>}
      <Field label="Nume complet" name="m-fullName" error={fe.fullName}>
        <input id="m-fullName" name="fullName" defaultValue={v.fullName} className={inputClass(fe.fullName)} />
      </Field>
      <Field label="Email" name="m-email" error={fe.email}>
        <input id="m-email" name="email" type="email" defaultValue={v.email} className={inputClass(fe.email)} />
      </Field>
      <Field label="Rol" name="m-role" error={fe.role}>
        <select id="m-role" name="role" defaultValue={v.role ?? "sales"} className={inputClass(fe.role)}>
          {(["manager", "sales", "operator"] as const).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Parolă inițială" name="m-password" error={fe.password} hint="Minimum 10 caractere, cu litere și cifre.">
        <input id="m-password" name="password" type="password" autoComplete="new-password" className={inputClass(fe.password)} />
      </Field>
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Se adaugă…" : "Adaugă utilizator"}
      </button>
      <p className="text-[12px] text-muted">Invitațiile prin email vor fi disponibile după configurarea furnizorului de email.</p>
    </form>
  );
}

export function MemberActions({ userId, role, mode }: { userId: string; role: string; mode: "role" | "remove" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Eroare");
      else router.refresh();
    });

  if (mode === "remove") {
    return (
      <button
        title="Elimină din echipă"
        disabled={pending}
        onClick={() => confirm("Eliminați utilizatorul din echipă? Accesul încetează imediat.") && run(() => removeMemberAction(userId))}
        className="btn-ghost size-8 !px-0 hover:text-bad"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }
  return (
    <>
      <select
        defaultValue={role}
        disabled={pending}
        onChange={(e) => run(() => changeRoleAction(userId, e.target.value))}
        className="input h-8 w-auto py-0 text-[13px]"
        aria-label="Rol"
      >
        {(["manager", "sales", "operator"] as const).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[12px] text-bad">{error}</p>}
    </>
  );
}
