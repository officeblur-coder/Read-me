import { z } from "zod";
import { parseMoneyToCents } from "@/lib/finance";
import {
  BODY_OPTIONS,
  DRIVETRAIN_OPTIONS,
  EMISSION_OPTIONS,
  EQUIPMENT_KEYS,
  FUEL_OPTIONS,
  ORIGIN_OPTIONS,
  TRANSMISSION_OPTIONS,
} from "@/lib/vehicle-options";

const empty = (v: unknown) => (typeof v === "string" && v.trim() === "") || v == null;

const optText = (max = 200) =>
  z.preprocess((v) => (empty(v) ? null : v), z.string().trim().max(max, `Maximum ${max} caractere.`).nullable());

const optInt = (min: number, max: number, label = "Valoare") =>
  z.preprocess(
    (v) => (empty(v) ? null : typeof v === "string" ? Number(v.replace(/[\s.]/g, "")) : v),
    z
      .number({ error: `${label} invalidă.` })
      .int(`${label} trebuie să fie un număr întreg.`)
      .min(min, `${label} minimă: ${min}.`)
      .max(max, `${label} maximă: ${max}.`)
      .nullable(),
  );

const optEnum = <T extends Record<string, string>>(options: T) =>
  z.preprocess(
    (v) => (empty(v) ? null : v),
    z.enum(Object.keys(options) as [string, ...string[]], { error: "Opțiune invalidă." }).nullable(),
  );

const money = z.preprocess((v, ctx) => {
  if (empty(v)) return null;
  try {
    return parseMoneyToCents(String(v));
  } catch {
    ctx.addIssue({ code: "custom", message: "Sumă invalidă." });
    return z.NEVER;
  }
}, z.number().int().min(0).max(100_000_000_00, "Sumă prea mare.").nullable());

const currentYear = new Date().getFullYear();

export const vehicleInputSchema = z.object({
  make: z.string().trim().min(1, "Marca este obligatorie.").max(60),
  model: z.string().trim().min(1, "Modelul este obligatoriu.").max(80),
  generation: optText(80),
  version: optText(120),
  year: z.preprocess(
    (v) => (empty(v) ? undefined : Number(v)),
    z
      .number({ error: "Anul este obligatoriu." })
      .int()
      .min(1950, "An invalid.")
      .max(currentYear + 1, "An invalid."),
  ),
  vin: z.preprocess(
    (v) => (empty(v) ? null : String(v).trim().toUpperCase().replace(/\s/g, "")),
    z
      .string()
      .regex(/^[A-HJ-NPR-Z0-9]{17}$/, "Seria VIN trebuie să aibă 17 caractere (fără I, O, Q).")
      .nullable(),
  ),
  plateNumber: z.preprocess(
    (v) => (empty(v) ? null : String(v).trim().toUpperCase()),
    z.string().max(15).nullable(),
  ),
  mileageKm: optInt(0, 2_000_000, "Kilometrajul"),
  engine: optText(80),
  engineCc: optInt(0, 10_000, "Capacitatea"),
  powerHp: optInt(0, 2_000, "Puterea"),
  powerKw: optInt(0, 1_500, "Puterea"),
  fuel: z.enum(Object.keys(FUEL_OPTIONS) as [string, ...string[]], { error: "Selectați combustibilul." }),
  transmission: z.enum(Object.keys(TRANSMISSION_OPTIONS) as [string, ...string[]], {
    error: "Selectați transmisia.",
  }),
  drivetrain: optEnum(DRIVETRAIN_OPTIONS),
  emissionStandard: optEnum(EMISSION_OPTIONS),
  bodyType: optEnum(BODY_OPTIONS),
  color: optText(40),
  doors: optInt(1, 9, "Numărul de uși"),
  seats: optInt(1, 60, "Numărul de locuri"),
  ownersCount: optInt(0, 50, "Numărul de proprietari"),
  origin: optEnum(ORIGIN_OPTIONS),
  firstRegistration: z.preprocess(
    (v) => (empty(v) ? null : v),
    z.iso.date({ error: "Dată invalidă." }).nullable(),
  ),
  acquiredAt: z.preprocess(
    (v) => (empty(v) ? undefined : v),
    z.iso.date({ error: "Dată invalidă." }).optional(),
  ),
  equipment: z
    .array(z.string())
    .default([])
    .transform((arr) => [...new Set(arr)].filter((k) => EQUIPMENT_KEYS.has(k))),
  description: optText(5000),
  internalNotes: optText(5000),
  purchasePrice: money,
  transportCost: money,
  repairCost: money,
  preparationCost: money,
  otherCosts: money,
  listPrice: money,
  minPrice: money,
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

/** Câmpurile protejate și permisiunea necesară pentru a le scrie. */
export const PROTECTED_FIELDS = {
  purchasePrice: "vehicle.costs.write",
  transportCost: "vehicle.costs.write",
  repairCost: "vehicle.costs.write",
  preparationCost: "vehicle.costs.write",
  otherCosts: "vehicle.costs.write",
  listPrice: "vehicle.price.write",
  minPrice: "vehicle.minPrice.write",
} as const;

export function formDataToVehicleInput(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of Object.keys(vehicleInputSchema.shape)) {
    if (key === "equipment") obj.equipment = fd.getAll("equipment").map(String);
    else if (fd.has(key)) obj[key] = fd.get(key);
  }
  return obj;
}
