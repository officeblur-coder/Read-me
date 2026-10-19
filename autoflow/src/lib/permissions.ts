// Matricea de permisiuni. Sursa unică de adevăr, folosită pe server pentru autorizare
// și în interfață doar pentru a ascunde acțiunile indisponibile.

export const ROLES = ["owner", "manager", "sales", "operator"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  "vehicle.read": ["owner", "manager", "sales", "operator"],
  "vehicle.create": ["owner", "manager", "sales", "operator"],
  "vehicle.update": ["owner", "manager", "sales", "operator"],
  "vehicle.delete": ["owner", "manager"],
  /** Prețul de listare. */
  "vehicle.price.write": ["owner", "manager"],
  /** Costuri de achiziție/pregătire și profit. */
  "vehicle.costs.read": ["owner", "manager"],
  "vehicle.costs.write": ["owner", "manager"],
  /** Prețul minim acceptat la negociere. */
  "vehicle.minPrice.read": ["owner", "manager", "sales"],
  "vehicle.minPrice.write": ["owner", "manager"],
  /** Rezervare și vânzare. */
  "vehicle.sell": ["owner", "manager", "sales"],
  /** Vânzare sub prețul minim sau anularea unei vânzări. */
  "vehicle.sell.override": ["owner", "manager"],
  "media.write": ["owner", "manager", "sales", "operator"],
  "dashboard.financials": ["owner", "manager"],
  "company.read": ["owner", "manager", "sales", "operator"],
  "company.update": ["owner", "manager"],
  "users.read": ["owner", "manager"],
  "users.manage": ["owner"],
  "audit.read": ["owner"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function permissionsFor(role: Role): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(role, p));
}

export class ForbiddenError extends Error {
  constructor(public permission: string) {
    super(`Nu aveți dreptul necesar pentru această acțiune (${permission}).`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: Role, permission: Permission) {
  if (!can(role, permission)) throw new ForbiddenError(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Proprietar",
  manager: "Manager",
  sales: "Agent vânzări",
  operator: "Operator",
};
