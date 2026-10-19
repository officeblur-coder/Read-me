// Aplică migrațiile SQL din db/migrations, în ordine, o singură dată fiecare.
// Rulează cu rolul proprietar (DATABASE_OWNER_URL), nu cu rolul aplicației.
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

export async function migrate(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const dir = path.join(__dirname, "..", "db", "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`✓ ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migrația ${file} a eșuat: ${(err as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_OWNER_URL;
  if (!url) throw new Error("DATABASE_OWNER_URL lipsește");
  migrate(url).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
