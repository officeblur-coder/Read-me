import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __autoflowPool?: Pool };

function getPool() {
  if (!globalForDb.__autoflowPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL lipsește din configurație.");
    globalForDb.__autoflowPool = new Pool({ connectionString: url, max: 10 });
  }
  return globalForDb.__autoflowPool;
}

export const db: Db = drizzle({ client: getPool(), schema });

/**
 * Rulează `fn` într-o tranzacție în care PostgreSQL cunoaște dealerul și utilizatorul curent.
 * Politicile RLS folosesc aceste valori, deci chiar și o interogare fără filtru pe dealer_id
 * nu poate citi sau modifica datele altui dealer.
 * dealerId trebuie să provină exclusiv din sesiunea validată pe server.
 */
export async function withTenant<T>(
  ctx: { dealerId: string | null; userId: string | null },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.dealer_id', ${ctx.dealerId ?? ""}, true), set_config('app.user_id', ${ctx.userId ?? ""}, true)`,
    );
    return fn(tx);
  });
}
