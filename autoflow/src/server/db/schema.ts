// Definiții Drizzle care oglindesc db/migrations/*.sql (migrațiile SQL sunt sursa de adevăr).
import {
  bigint,
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const money = (name: string) => bigint(name, { mode: "number" });

export const dealers = pgTable("dealers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  legalName: text("legal_name"),
  cui: text("cui"),
  regCom: text("reg_com"),
  address: text("address"),
  city: text("city"),
  county: text("county"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  brandColor: text("brand_color"),
  locale: text("locale").notNull().default("ro"),
  currency: text("currency").notNull().default("EUR"),
  status: text("status").notNull().default("trial"),
  planCode: text("plan_code").notNull().default("start"),
  stockSeq: integer("stock_seq").notNull().default(0),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  locale: text("locale").notNull().default("ro"),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  lastLoginAt: ts("last_login_at"),
  disabledAt: ts("disabled_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  activeDealerId: uuid("active_dealer_id"),
  expiresAt: ts("expires_at").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealerId: uuid("dealer_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealerId: uuid("dealer_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(),
  locationId: uuid("location_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  dealerId: uuid("dealer_id"),
  actorUserId: uuid("actor_user_id"),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  ip: text("ip"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealerId: uuid("dealer_id").notNull(),
  locationId: uuid("location_id"),
  stockNumber: integer("stock_number").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  generation: text("generation"),
  version: text("version"),
  year: smallint("year").notNull(),
  vin: text("vin"),
  plateNumber: text("plate_number"),
  mileageKm: integer("mileage_km"),
  engine: text("engine"),
  engineCc: integer("engine_cc"),
  powerHp: integer("power_hp"),
  powerKw: integer("power_kw"),
  fuel: text("fuel").notNull(),
  transmission: text("transmission").notNull(),
  drivetrain: text("drivetrain"),
  emissionStandard: text("emission_standard"),
  bodyType: text("body_type"),
  color: text("color"),
  doors: smallint("doors"),
  seats: smallint("seats"),
  ownersCount: smallint("owners_count"),
  origin: text("origin"),
  firstRegistration: date("first_registration", { mode: "string" }),
  equipment: jsonb("equipment").$type<string[]>().notNull().default([]),
  description: text("description"),
  internalNotes: text("internal_notes"),
  purchasePrice: money("purchase_price"),
  transportCost: money("transport_cost"),
  repairCost: money("repair_cost"),
  preparationCost: money("preparation_cost"),
  otherCosts: money("other_costs"),
  listPrice: money("list_price"),
  minPrice: money("min_price"),
  salePrice: money("sale_price"),
  status: text("status").notNull().default("preparation"),
  statusChangedAt: ts("status_changed_at").notNull().defaultNow(),
  acquiredAt: date("acquired_at", { mode: "string" }).notNull(),
  listedAt: ts("listed_at"),
  soldAt: ts("sold_at"),
  soldByUserId: uuid("sold_by_user_id"),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const vehicleMedia = pgTable("vehicle_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealerId: uuid("dealer_id").notNull(),
  vehicleId: uuid("vehicle_id").notNull(),
  kind: text("kind").notNull().default("image"),
  storageKey: text("storage_key").notNull(),
  thumbKey: text("thumb_key"),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes").notNull(),
  position: integer("position").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const vehicleStatusHistory = pgTable("vehicle_status_history", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  dealerId: uuid("dealer_id").notNull(),
  vehicleId: uuid("vehicle_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  userId: uuid("user_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type VehicleRow = typeof vehicles.$inferSelect;
export type DealerRow = typeof dealers.$inferSelect;
