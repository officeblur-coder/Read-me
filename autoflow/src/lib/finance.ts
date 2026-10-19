// Calcule financiare per autoturism. Toate sumele sunt în cenți (numere întregi).
// „Profit brut” = preț − cost direct al autoturismului. Nu este profit contabil net
// (nu include TVA, regim de marjă, salarii, chirie, comisioane sau alte cheltuieli generale).

export type VehicleMoney = {
  purchasePrice: number | null;
  transportCost: number | null;
  repairCost: number | null;
  preparationCost: number | null;
  otherCosts: number | null;
  listPrice: number | null;
  minPrice: number | null;
  salePrice: number | null;
};

export function totalCost(v: VehicleMoney): number | null {
  // Fără preț de achiziție costul total nu are sens.
  if (v.purchasePrice == null) return null;
  return (
    v.purchasePrice +
    (v.transportCost ?? 0) +
    (v.repairCost ?? 0) +
    (v.preparationCost ?? 0) +
    (v.otherCosts ?? 0)
  );
}

export function estimatedGrossProfit(v: VehicleMoney): number | null {
  const cost = totalCost(v);
  if (cost == null || v.listPrice == null) return null;
  return v.listPrice - cost;
}

export function realizedGrossProfit(v: VehicleMoney): number | null {
  const cost = totalCost(v);
  if (cost == null || v.salePrice == null) return null;
  return v.salePrice - cost;
}

/** Marja în procente din prețul de vânzare/listare, cu o zecimală. */
export function marginPercent(profit: number | null, price: number | null): number | null {
  if (profit == null || price == null || price === 0) return null;
  return Math.round((profit / price) * 1000) / 10;
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Convertește input de formular („12.500,50”, „12500.5”, „12 500”) în cenți. */
export function parseMoneyToCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = input.trim().replace(/\s|€|eur|ron|lei/gi, "");
  if (s === "") return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // separatorul care apare ultimul este cel zecimal
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // „12,500” → separator de mii; „12,50” → zecimal
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    // „12.500” → separator de mii (convenția română)
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Sumă invalidă: ${input}`);
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
