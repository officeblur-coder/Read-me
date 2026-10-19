"use client";

import { useActionState } from "react";
import { updateCompanyAction, type FormState } from "../actions";
import { Field, FormAlert, inputClass } from "@/components/ui/field";

const FIELDS: { name: string; label: string; span?: boolean; type?: string; hint?: string }[] = [
  { name: "name", label: "Nume comercial *" },
  { name: "legalName", label: "Denumire juridică", hint: "ex. Auto Exemplu SRL" },
  { name: "cui", label: "CUI" },
  { name: "regCom", label: "Nr. Registrul Comerțului", hint: "ex. J40/1234/2020" },
  { name: "address", label: "Adresă", span: true },
  { name: "city", label: "Localitate" },
  { name: "county", label: "Județ" },
  { name: "phone", label: "Telefon", type: "tel" },
  { name: "email", label: "Email", type: "email" },
  { name: "website", label: "Website", type: "url", hint: "https://…" },
];

export function CompanyForm({ defaults, readOnly }: { defaults: Record<string, string>; readOnly: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateCompanyAction, { ok: true });
  const fe = (!state.ok && state.fieldErrors) || {};
  const v = state.values ?? defaults;
  return (
    <form action={action} className="card max-w-3xl space-y-5 p-5 sm:p-6">
      {!state.ok && <FormAlert>{state.error}</FormAlert>}
      {state.ok && state.message && <FormAlert tone="good">{state.message}</FormAlert>}
      <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <Field key={f.name} label={f.label} name={f.name} error={fe[f.name]} hint={f.hint} className={f.span ? "sm:col-span-2" : ""}>
            <input id={f.name} name={f.name} type={f.type ?? "text"} defaultValue={v[f.name]} className={inputClass(fe[f.name])} />
          </Field>
        ))}
        <Field label="Culoare de brand" name="brandColor" error={fe.brandColor} hint="Folosită pe website-ul public (Etapa 2).">
          <div className="flex gap-2">
            <input id="brandColor" name="brandColor" type="color" defaultValue={v.brandColor || "#2a78d6"} className="h-10 w-14 cursor-pointer rounded-lg border border-line-strong bg-surface p-1" />
          </div>
        </Field>
      </fieldset>
      <p className="text-[12.5px] text-muted">Încărcarea logo-ului va fi disponibilă odată cu modulul Website.</p>
      {!readOnly && (
        <div className="flex justify-end border-t border-line pt-4">
          <button className="btn-primary" disabled={pending}>
            {pending ? "Se salvează…" : "Salvează"}
          </button>
        </div>
      )}
    </form>
  );
}
