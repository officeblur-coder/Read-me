import { describe, expect, it } from "vitest";
import { estimatedGrossProfit, marginPercent, parseMoneyToCents, realizedGrossProfit, totalCost } from "@/lib/finance";

const base = {
  purchasePrice: 1_000_000,
  transportCost: 50_000,
  repairCost: 120_000,
  preparationCost: 30_000,
  otherCosts: null,
  listPrice: 1_390_000,
  minPrice: 1_300_000,
  salePrice: null,
};

describe("calcule financiare", () => {
  it("cost total = achiziție + transport + reparații + pregătire + alte costuri", () => {
    expect(totalCost(base)).toBe(1_200_000);
  });
  it("fără preț de achiziție nu există cost total sau profit", () => {
    expect(totalCost({ ...base, purchasePrice: null })).toBeNull();
    expect(estimatedGrossProfit({ ...base, purchasePrice: null })).toBeNull();
  });
  it("profit brut estimat și realizat", () => {
    expect(estimatedGrossProfit(base)).toBe(190_000);
    expect(realizedGrossProfit(base)).toBeNull();
    expect(realizedGrossProfit({ ...base, salePrice: 1_150_000 })).toBe(-50_000);
  });
  it("marja procentuală", () => {
    expect(marginPercent(190_000, 1_390_000)).toBe(13.7);
    expect(marginPercent(100, 0)).toBeNull();
  });
  it("interpretează sume în format românesc și internațional", () => {
    expect(parseMoneyToCents("12.500")).toBe(1_250_000);
    expect(parseMoneyToCents("12.500,50")).toBe(1_250_050);
    expect(parseMoneyToCents("12,500.50")).toBe(1_250_050);
    expect(parseMoneyToCents("12 500 €")).toBe(1_250_000);
    expect(parseMoneyToCents("99,9")).toBe(9_990);
    expect(parseMoneyToCents("1.5")).toBe(150);
    expect(parseMoneyToCents("")).toBeNull();
    expect(() => parseMoneyToCents("abc")).toThrow();
    expect(() => parseMoneyToCents("-5")).toThrow();
  });
});
