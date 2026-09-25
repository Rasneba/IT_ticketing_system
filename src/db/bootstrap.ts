import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";
import { seedDatabase } from "./seed-data";

/**
 * Creates the schema from the generated SQL (drizzle/*.sql) when the database is
 * empty, then seeds demo data if there are no users. Safe to call repeatedly.
 */
async function ensureSchema() {
  const res = await db.execute(sql`select to_regclass('public.users') as t`);
  const exists = (res.rows[0] as { t: string | null } | undefined)?.t;
  if (exists) return;
  const dir = path.join(process.cwd(), "drizzle");
  if (!fs.existsSync(dir)) {
    console.warn("[bootstrap] schema missing and no ./drizzle migrations folder found");
    return;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    for (const statement of content.split("--> statement-breakpoint")) {
      const s = statement.trim();
      if (s) await db.execute(sql.raw(s));
    }
  }
  console.log(`[bootstrap] schema created from ${files.length} migration file(s)`);
}

let ready: Promise<void> | null = null;

export function ensureDatabaseReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureSchema();
      const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(users);
      if (n === 0) {
        await seedDatabase(db);
        console.log("[bootstrap] demo data seeded");
      }
    })().catch((err) => {
      console.error("[bootstrap] failed", err);
      ready = null;
    });
  }
  return ready;
}
