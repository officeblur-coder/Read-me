import { beforeAll, describe, expect, it } from "vitest";
import { appClient, resetDatabase } from "./db-helpers";
import { createSession, registerDealer, resolveSession, verifyCredentials } from "@/server/auth/core";
import {
  changeVehicleStatus,
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
} from "@/server/vehicles/service";
import { getDashboard } from "@/server/dashboard/service";
import { addTeamMember, removeMember } from "@/server/company/service";
import type { Role } from "@/lib/permissions";

type Ctx = { dealerId: string; userId: string; role: Role };
let A: Ctx;
let B: Ctx;
let vehicleA: string;

const car = {
  make: "Volkswagen",
  model: "Passat",
  year: "2019",
  fuel: "diesel",
  transmission: "automatic",
  mileageKm: "148000",
  vin: "WVWZZZ3CZKE012345",
  equipment: ["navigation", "acc", "necunoscut"],
  purchasePrice: "14.000",
  transportCost: "500",
  repairCost: "800",
  listPrice: "18.900",
  minPrice: "17.500",
};

beforeAll(async () => {
  await resetDatabase();
  const a = await registerDealer({
    companyName: "Auto Alfa",
    fullName: "Ana Pop",
    email: "ana@alfa.ro",
    password: "parola-sigura-1",
  });
  const b = await registerDealer({
    companyName: "Auto Beta",
    fullName: "Bogdan Ionescu",
    email: "bogdan@beta.ro",
    password: "parola-sigura-2",
  });
  A = { ...a, role: "owner" };
  B = { ...b, role: "owner" };
  vehicleA = (await createVehicle(A, car)).id;
});

describe("autentificare", () => {
  it("verifică parola și creează o sesiune validă", async () => {
    expect(await verifyCredentials("ana@alfa.ro", "gresit-123456")).toBeNull();
    const cred = await verifyCredentials("ANA@alfa.ro", "parola-sigura-1");
    expect(cred).toEqual({ userId: A.userId, dealerId: A.dealerId });
    const { token } = await createSession(cred!.userId, cred!.dealerId);
    const ctx = await resolveSession(token);
    expect(ctx?.role).toBe("owner");
    expect(ctx?.dealer.name).toBe("Auto Alfa");
    expect(await resolveSession("token-inexistent")).toBeNull();
  });

  it("refuză un email deja înregistrat", async () => {
    await expect(
      registerDealer({ companyName: "Auto Gama", fullName: "Ana", email: "ana@alfa.ro", password: "parola-sigura-3" }),
    ).rejects.toThrow(/Există deja/);
  });
});

describe("autoturisme", () => {
  it("atribuie număr de stoc, filtrează dotările necunoscute și salvează sumele în cenți", async () => {
    const { vehicle } = await getVehicle(A, vehicleA);
    expect(vehicle.stockNumber).toBe(1);
    expect(vehicle.equipment).toEqual(["navigation", "acc"]);
    expect(vehicle.purchasePrice).toBe(1_400_000);
    expect(vehicle.totalCost).toBe(1_530_000);
    expect(vehicle.estimatedProfit).toBe(360_000);
    expect(vehicle.status).toBe("preparation");
  });

  it("ascunde costurile și prețul minim de rolurile neautorizate", async () => {
    const sales = { ...A, role: "sales" as const };
    const operator = { ...A, role: "operator" as const };
    const s = (await getVehicle(sales, vehicleA)).vehicle;
    expect(s.purchasePrice).toBeUndefined();
    expect(s.estimatedProfit).toBeUndefined();
    expect(s.minPrice).toBe(1_750_000);
    const o = (await getVehicle(operator, vehicleA)).vehicle;
    expect(o.minPrice).toBeUndefined();
  });

  it("un agent nu poate modifica costurile, chiar dacă le trimite în cerere", async () => {
    const sales = { ...A, role: "sales" as const };
    await updateVehicle(sales, vehicleA, { ...car, purchasePrice: "1", listPrice: "1", mileageKm: "150000" });
    const { vehicle } = await getVehicle(A, vehicleA);
    expect(vehicle.purchasePrice).toBe(1_400_000);
    expect(vehicle.listPrice).toBe(1_890_000);
    expect(vehicle.mileageKm).toBe(150_000);
  });

  it("validează VIN-ul și anul", async () => {
    await expect(createVehicle(A, { ...car, vin: "INVALID" })).rejects.toThrow();
    await expect(createVehicle(A, { ...car, vin: null, year: "1800" })).rejects.toThrow();
  });

  it("aplică fluxul de status și calculează profitul realizat", async () => {
    const sales = { ...A, role: "sales" as const };
    await changeVehicleStatus(A, vehicleA, "available");
    await changeVehicleStatus(sales, vehicleA, "reserved");
    await expect(changeVehicleStatus(sales, vehicleA, "sold", { salePrice: 1_600_000 })).rejects.toThrow(/sub prețul minim/);
    await changeVehicleStatus(sales, vehicleA, "sold", { salePrice: 1_800_000 });
    const { vehicle, history } = await getVehicle(A, vehicleA);
    expect(vehicle.status).toBe("sold");
    expect(vehicle.realizedProfit).toBe(270_000);
    expect(history.map((h) => h.toStatus)).toEqual(["sold", "reserved", "available", "preparation"]);
    await expect(deleteVehicle(A, vehicleA)).rejects.toThrow(/vândut/);
  });

  it("dashboard-ul calculează valorile din date reale", async () => {
    const d = await getDashboard(A);
    expect(d.counts.sold).toBe(1);
    expect(d.thisMonth.sold).toBe(1);
    expect(d.thisMonth.revenue).toBe(1_800_000);
    expect(d.thisMonth.profit).toBe(270_000);
    expect(d.byMake).toEqual([{ make: "Volkswagen", n: 1 }]);
    const asSales = await getDashboard({ ...A, role: "sales" });
    expect(asSales.thisMonth.revenue).toBeNull();
    expect(asSales.thisMonth.profit).toBeNull();
  });
});

describe("izolare multi-tenant", () => {
  it("dealerul B nu vede, nu modifică și nu șterge autoturismele lui A prin servicii", async () => {
    await expect(getVehicle(B, vehicleA)).rejects.toThrow(/nu a fost găsit/);
    await expect(updateVehicle(B, vehicleA, car)).rejects.toThrow(/nu a fost găsit/);
    await expect(changeVehicleStatus(B, vehicleA, "available")).rejects.toThrow(/nu a fost găsit/);
    await expect(deleteVehicle(B, vehicleA)).rejects.toThrow(/nu a fost găsit/);
    const list = await listVehicles(B, {});
    expect(list.total).toBe(0);
    expect((await getDashboard(B)).counts.total).toBe(0);
  });

  it("același VIN poate exista la dealeri diferiți, dar numerotarea stocului e separată", async () => {
    const v = await createVehicle(B, car);
    expect(v.stockNumber).toBe(1);
  });

  it("RLS blochează accesul chiar și prin SQL fără filtru pe dealer_id", async () => {
    const c = await appClient();
    try {
      // Fără context de tenant: nimic vizibil.
      expect((await c.query("select * from vehicles")).rowCount).toBe(0);

      await c.query("begin");
      await c.query("select set_config('app.dealer_id', $1, true)", [B.dealerId]);
      const rows = (await c.query("select dealer_id from vehicles")).rows;
      expect(rows.every((r) => r.dealer_id === B.dealerId)).toBe(true);
      expect((await c.query("update vehicles set make = 'X' where id = $1", [vehicleA])).rowCount).toBe(0);
      expect((await c.query("delete from vehicles where id = $1", [vehicleA])).rowCount).toBe(0);
      await expect(
        c.query(
          "insert into vehicles (dealer_id, stock_number, make, model, year, fuel, transmission) values ($1, 99, 'a','b',2020,'diesel','manual')",
          [A.dealerId],
        ),
      ).rejects.toThrow(/row-level security/);
      await c.query("rollback");

      // Jurnalul de audit este append-only pentru aplicație.
      await c.query("begin");
      await c.query("select set_config('app.dealer_id', $1, true)", [A.dealerId]);
      await expect(c.query("delete from audit_log")).rejects.toThrow(/permission denied/);
      await c.query("rollback");
    } finally {
      await c.end();
    }
  });

  it("eliminarea unui membru îi invalidează imediat sesiunea", async () => {
    const m = await addTeamMember(A, {
      fullName: "Agent Test",
      email: "agent@alfa.ro",
      role: "sales",
      password: "parola-agent-1",
    });
    const { token } = await createSession(m.id, A.dealerId);
    expect((await resolveSession(token))?.role).toBe("sales");
    await removeMember(A, m.id);
    expect(await resolveSession(token)).toBeNull();
  });
});
