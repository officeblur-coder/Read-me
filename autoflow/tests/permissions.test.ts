import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";
import { allowedTransitions, checkTransition } from "@/lib/vehicle-status";

describe("permisiuni", () => {
  it("doar owner/manager văd costurile și profitul", () => {
    expect(can("owner", "vehicle.costs.read")).toBe(true);
    expect(can("manager", "vehicle.costs.read")).toBe(true);
    expect(can("sales", "vehicle.costs.read")).toBe(false);
    expect(can("operator", "vehicle.costs.read")).toBe(false);
  });
  it("operatorul nu vede prețul minim și nu poate vinde", () => {
    expect(can("operator", "vehicle.minPrice.read")).toBe(false);
    expect(can("operator", "vehicle.sell")).toBe(false);
    expect(can("sales", "vehicle.minPrice.read")).toBe(true);
  });
  it("doar proprietarul gestionează utilizatorii", () => {
    expect(can("owner", "users.manage")).toBe(true);
    expect(can("manager", "users.manage")).toBe(false);
  });
});

describe("tranziții de status", () => {
  const priced = { listPrice: 1_000_000 };
  it("nu permite Disponibil fără preț de listare", () => {
    expect(checkTransition("owner", "preparation", "available", { listPrice: null }).ok).toBe(false);
    expect(checkTransition("owner", "preparation", "available", priced).ok).toBe(true);
  });
  it("operatorul nu poate rezerva/vinde; agentul nu poate anula o vânzare", () => {
    expect(allowedTransitions("operator", "available", priced)).toEqual(["preparation"]);
    expect(checkTransition("sales", "available", "sold", priced).ok).toBe(true);
    expect(checkTransition("sales", "sold", "available", priced).ok).toBe(false);
    expect(checkTransition("manager", "sold", "available", priced).ok).toBe(true);
  });
  it("respinge tranziții inexistente", () => {
    expect(checkTransition("owner", "preparation", "sold", priced).ok).toBe(false);
  });
});
