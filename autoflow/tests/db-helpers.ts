import { Client } from "pg";
import { migrate } from "../scripts/migrate";

export async function resetDatabase() {
  const url = process.env.DATABASE_OWNER_URL_TEST!;
  await migrate(url);
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query(
    "TRUNCATE dealers, users, sessions, locations, memberships, audit_log, vehicles, vehicle_media, vehicle_status_history CASCADE",
  );
  await c.end();
}

/** Conexiune directă cu rolul aplicației, pentru a verifica RLS fără stratul de servicii. */
export async function appClient() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  return c;
}
