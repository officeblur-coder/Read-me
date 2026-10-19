"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { saveVehicleAction, type VehicleFormState } from "./actions";
import { Field, FormAlert, inputClass } from "@/components/ui/field";
import {
  BODY_OPTIONS,
  DRIVETRAIN_OPTIONS,
  EMISSION_OPTIONS,
  EQUIPMENT,
  FUEL_OPTIONS,
  ORIGIN_OPTIONS,
  TRANSMISSION_OPTIONS,
} from "@/lib/vehicle-options";
import { estimatedGrossProfit, marginPercent, parseMoneyToCents, totalCost } from "@/lib/finance";
import { formatMoney } from "@/lib/format";

const COMMON_MAKES = [
  "Alfa Romeo", "Audi", "BMW", "Citroën", "Cupra", "Dacia", "Fiat", "Ford", "Honda", "Hyundai", "Jaguar", "Jeep", "Kia",
  "Land Rover", "Lexus", "Mazda", "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Opel", "Peugeot", "Porsche", "Renault",
  "Seat", "Skoda", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo",
];

export type VehicleFormDefaults = Record<string, string | string[] | null | undefined>;

export type VehicleFormPerms = { costs: boolean; price: boolean; minPrice: boolean };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card grid gap-5 p-5 sm:p-6 lg:grid-cols-[220px_1fr] lg:gap-8">
      <div>
        <h2 className="text-[14.5px] font-semibold">{title}</h2>
        {description && <p className="mt-1 text-[12.5px] text-muted">{description}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Select({ name, options, value, error, placeholder = "—" }: { name: string; options: Record<string, string>; value?: string | null; error?: string; placeholder?: string }) {
  return (
    <select id={name} name={name} defaultValue={value ?? ""} className={inputClass(error)}>
      <option value="">{placeholder}</option>
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}

const safeCents = (s: string) => {
  try {
    return parseMoneyToCents(s);
  } catch {
    return null;
  }
};

export function VehicleForm({
  vehicleId,
  defaults,
  perms,
  currency,
}: {
  vehicleId: string | null;
  defaults: VehicleFormDefaults;
  perms: VehicleFormPerms;
  currency: string;
}) {
  const [state, action, pending] = useActionState<VehicleFormState, FormData>(saveVehicleAction.bind(null, vehicleId), { ok: true });
  const errorState = !state.ok ? state : null;
  const fe = errorState?.fieldErrors ?? {};
  const v = (errorState && "values" in state ? (state.values as VehicleFormDefaults) : null) ?? defaults;
  const str = (k: string) => (v[k] == null ? "" : String(v[k]));
  const equipment = new Set(Array.isArray(v.equipment) ? v.equipment : []);
  const [eqCount, setEqCount] = useState(equipment.size);

  // Calcul live al costului și marjei (aceleași funcții ca pe server).
  const [money, setMoney] = useState(() => ({
    purchasePrice: str("purchasePrice"),
    transportCost: str("transportCost"),
    repairCost: str("repairCost"),
    preparationCost: str("preparationCost"),
    otherCosts: str("otherCosts"),
    listPrice: str("listPrice"),
  }));
  const calc = useMemo(() => {
    const m = {
      purchasePrice: safeCents(money.purchasePrice),
      transportCost: safeCents(money.transportCost),
      repairCost: safeCents(money.repairCost),
      preparationCost: safeCents(money.preparationCost),
      otherCosts: safeCents(money.otherCosts),
      listPrice: safeCents(money.listPrice),
      minPrice: null,
      salePrice: null,
    };
    const profit = estimatedGrossProfit(m);
    return { cost: totalCost(m), profit, margin: marginPercent(profit, m.listPrice) };
  }, [money]);

  const kwRef = useRef<HTMLInputElement>(null);
  const moneyInput = (name: keyof typeof money, label: string, hint?: string) => (
    <Field label={label} name={name} error={fe[name]} hint={hint}>
      <div className="relative">
        <input
          id={name}
          name={name}
          inputMode="decimal"
          value={money[name]}
          onChange={(e) => setMoney((s) => ({ ...s, [name]: e.target.value }))}
          className={inputClass(fe[name]) + " tabular pr-12"}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-muted">{currency}</span>
      </div>
    </Field>
  );

  return (
    <form action={action} className="space-y-4 pb-24" noValidate>
      {errorState && <FormAlert>{errorState.error}</FormAlert>}

      <Section title="Identificare" description="Datele de bază. Marca, modelul, anul, combustibilul și transmisia sunt obligatorii.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Marcă *" name="make" error={fe.make}>
            <input id="make" name="make" list="makes" defaultValue={str("make")} required className={inputClass(fe.make)} />
            <datalist id="makes">
              {COMMON_MAKES.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          <Field label="Model *" name="model" error={fe.model}>
            <input id="model" name="model" defaultValue={str("model")} required className={inputClass(fe.model)} />
          </Field>
          <Field label="Generație" name="generation" error={fe.generation}>
            <input id="generation" name="generation" defaultValue={str("generation")} placeholder="ex. B8, F30, Mk7" className={inputClass(fe.generation)} />
          </Field>
          <Field label="Versiune / echipare" name="version" error={fe.version} className="xl:col-span-2">
            <input id="version" name="version" defaultValue={str("version")} placeholder="ex. 2.0 TDI Highline" className={inputClass(fe.version)} />
          </Field>
          <Field label="An fabricație *" name="year" error={fe.year}>
            <input id="year" name="year" inputMode="numeric" defaultValue={str("year")} required className={inputClass(fe.year)} />
          </Field>
          <Field label="Serie VIN" name="vin" error={fe.vin}>
            <input id="vin" name="vin" defaultValue={str("vin")} maxLength={17} autoCapitalize="characters" className={inputClass(fe.vin) + " font-mono uppercase"} />
          </Field>
          <Field label="Număr înmatriculare" name="plateNumber" error={fe.plateNumber}>
            <input id="plateNumber" name="plateNumber" defaultValue={str("plateNumber")} className={inputClass(fe.plateNumber) + " uppercase"} />
          </Field>
          <Field label="Kilometraj" name="mileageKm" error={fe.mileageKm}>
            <div className="relative">
              <input id="mileageKm" name="mileageKm" inputMode="numeric" defaultValue={str("mileageKm")} className={inputClass(fe.mileageKm) + " tabular pr-10"} />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-muted">km</span>
            </div>
          </Field>
          <Field label="Prima înmatriculare" name="firstRegistration" error={fe.firstRegistration}>
            <input id="firstRegistration" name="firstRegistration" type="date" defaultValue={str("firstRegistration")} className={inputClass(fe.firstRegistration)} />
          </Field>
          <Field label="Număr proprietari" name="ownersCount" error={fe.ownersCount}>
            <input id="ownersCount" name="ownersCount" inputMode="numeric" defaultValue={str("ownersCount")} className={inputClass(fe.ownersCount)} />
          </Field>
          <Field label="Proveniență" name="origin" error={fe.origin}>
            <Select name="origin" options={ORIGIN_OPTIONS} value={str("origin")} error={fe.origin} />
          </Field>
        </div>
      </Section>

      <Section title="Motorizare și caracteristici">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Combustibil *" name="fuel" error={fe.fuel}>
            <Select name="fuel" options={FUEL_OPTIONS} value={str("fuel")} error={fe.fuel} placeholder="Selectați" />
          </Field>
          <Field label="Transmisie *" name="transmission" error={fe.transmission}>
            <Select name="transmission" options={TRANSMISSION_OPTIONS} value={str("transmission")} error={fe.transmission} placeholder="Selectați" />
          </Field>
          <Field label="Tracțiune" name="drivetrain" error={fe.drivetrain}>
            <Select name="drivetrain" options={DRIVETRAIN_OPTIONS} value={str("drivetrain")} error={fe.drivetrain} />
          </Field>
          <Field label="Motorizare" name="engine" error={fe.engine}>
            <input id="engine" name="engine" defaultValue={str("engine")} placeholder="ex. 2.0 TDI" className={inputClass(fe.engine)} />
          </Field>
          <Field label="Capacitate cilindrică" name="engineCc" error={fe.engineCc}>
            <div className="relative">
              <input id="engineCc" name="engineCc" inputMode="numeric" defaultValue={str("engineCc")} className={inputClass(fe.engineCc) + " tabular pr-12"} />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-muted">cm³</span>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Putere (CP)" name="powerHp" error={fe.powerHp}>
              <input
                id="powerHp"
                name="powerHp"
                inputMode="numeric"
                defaultValue={str("powerHp")}
                onBlur={(e) => {
                  const hp = Number(e.target.value);
                  if (kwRef.current && !kwRef.current.value && hp > 0) kwRef.current.value = String(Math.round(hp * 0.7355));
                }}
                className={inputClass(fe.powerHp) + " tabular"}
              />
            </Field>
            <Field label="Putere (kW)" name="powerKw" error={fe.powerKw}>
              <input ref={kwRef} id="powerKw" name="powerKw" inputMode="numeric" defaultValue={str("powerKw")} className={inputClass(fe.powerKw) + " tabular"} />
            </Field>
          </div>
          <Field label="Normă de poluare" name="emissionStandard" error={fe.emissionStandard}>
            <Select name="emissionStandard" options={EMISSION_OPTIONS} value={str("emissionStandard")} error={fe.emissionStandard} />
          </Field>
          <Field label="Caroserie" name="bodyType" error={fe.bodyType}>
            <Select name="bodyType" options={BODY_OPTIONS} value={str("bodyType")} error={fe.bodyType} />
          </Field>
          <Field label="Culoare" name="color" error={fe.color}>
            <input id="color" name="color" defaultValue={str("color")} className={inputClass(fe.color)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Uși" name="doors" error={fe.doors}>
              <input id="doors" name="doors" inputMode="numeric" defaultValue={str("doors")} className={inputClass(fe.doors)} />
            </Field>
            <Field label="Locuri" name="seats" error={fe.seats}>
              <input id="seats" name="seats" inputMode="numeric" defaultValue={str("seats")} className={inputClass(fe.seats)} />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Dotări" description={`${eqCount} selectate. Generatorul de anunțuri va folosi exclusiv dotările bifate aici.`}>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {EQUIPMENT.map((cat) => (
            <fieldset key={cat.key}>
              <legend className="eyebrow mb-2">{cat.label}</legend>
              <div className="space-y-1">
                {Object.entries(cat.items).map(([k, label]) => (
                  <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-[13.5px] hover:bg-surface-2">
                    <input
                      type="checkbox"
                      name="equipment"
                      value={k}
                      defaultChecked={equipment.has(k)}
                      onChange={(e) => setEqCount((c) => c + (e.target.checked ? 1 : -1))}
                      className="size-4 rounded accent-[var(--accent)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Section>

      <Section title="Descriere și note">
        <div className="grid gap-4">
          <Field label="Descriere pentru clienți" name="description" error={fe.description} hint="Text vizibil în anunțuri. Va putea fi generat cu AI în Etapa 2.">
            <textarea id="description" name="description" rows={5} defaultValue={str("description")} className={inputClass(fe.description)} />
          </Field>
          <Field label="Note interne" name="internalNotes" error={fe.internalNotes} hint="Vizibile doar echipei. Nu apar niciodată în anunțuri.">
            <textarea id="internalNotes" name="internalNotes" rows={3} defaultValue={str("internalNotes")} className={inputClass(fe.internalNotes)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Situație financiară"
        description="Profitul brut = preț − cost direct al autoturismului. Nu include TVA, salarii, chirii sau alte cheltuieli generale."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Data achiziției" name="acquiredAt" error={fe.acquiredAt}>
            <input id="acquiredAt" name="acquiredAt" type="date" defaultValue={str("acquiredAt")} className={inputClass(fe.acquiredAt)} />
          </Field>
          {perms.costs && (
            <>
              {moneyInput("purchasePrice", "Preț achiziție")}
              {moneyInput("transportCost", "Cost transport")}
              {moneyInput("repairCost", "Cost reparații")}
              {moneyInput("preparationCost", "Cost pregătire vânzare", "Detailing, ITP, acte etc.")}
              {moneyInput("otherCosts", "Alte cheltuieli")}
            </>
          )}
          {perms.price && moneyInput("listPrice", "Preț de listare")}
          {perms.minPrice && (
            <Field label="Preț minim acceptat" name="minPrice" error={fe.minPrice} hint="Vizibil doar proprietarului, managerilor și agenților.">
              <div className="relative">
                <input id="minPrice" name="minPrice" inputMode="decimal" defaultValue={str("minPrice")} className={inputClass(fe.minPrice) + " tabular pr-12"} />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-muted">{currency}</span>
              </div>
            </Field>
          )}
        </div>
        {!perms.price && (
          <p className="mt-4 text-[13px] text-muted">Prețurile și costurile se completează de proprietar sau manager.</p>
        )}
        {perms.costs && (
          <dl className="mt-5 grid grid-cols-3 gap-3 rounded-lg bg-surface-2 p-4">
            <div>
              <dt className="text-[12px] text-fg-2">Cost total</dt>
              <dd className="tabular text-[17px] font-semibold">{formatMoney(calc.cost, currency)}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-2">Profit brut estimat</dt>
              <dd className={`tabular text-[17px] font-semibold ${calc.profit != null && calc.profit < 0 ? "text-bad" : ""}`}>
                {formatMoney(calc.profit, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-2">Marjă</dt>
              <dd className="tabular text-[17px] font-semibold">{calc.margin != null ? `${calc.margin}%` : "—"}</dd>
            </div>
          </dl>
        )}
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/90 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link href={vehicleId ? `/vehicles/${vehicleId}` : "/vehicles"} className="btn-ghost">
            Anulează
          </Link>
          <button className="btn-primary min-w-36" disabled={pending}>
            {pending ? "Se salvează…" : vehicleId ? "Salvează modificările" : "Creează fișa"}
          </button>
        </div>
      </div>
    </form>
  );
}
