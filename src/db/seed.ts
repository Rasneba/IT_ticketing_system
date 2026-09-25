/**
 * CLI seeder:  npx tsx src/db/seed.ts          (seed only if empty)
 *              npx tsx src/db/seed.ts --reset  (truncate + reseed)
 */
import "dotenv/config";
import { sql } from "drizzle-orm";

async function main() {
  const { db, pool } = await import("./index");
  const { seedDatabase, resolveDemoPassword, DEMO_EMAIL } = await import("./seed-data");
  const { users } = await import("./schema");
  const reset = process.argv.includes("--reset");

  // Resolve before touching the database so a misconfigured production seed
  // fails fast instead of truncating and then erroring halfway through.
  const { password, isProduction } = resolveDemoPassword();

  if (reset) {
    await db.execute(
      sql`truncate table audit_logs, api_keys, meter_readings, ticket_notes, tickets, sessions, assets, users, units, categories restart identity cascade`,
    );
    console.log("Tables truncated.");
  }

  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(users);
  if (n > 0) {
    console.log(`Database already contains ${n} users — skipping (use --reset to reseed).`);
  } else {
    await seedDatabase(db);
    console.log(
      isProduction
        ? `Demo data seeded. Sign in as ${DEMO_EMAIL} using the DEMO_PASSWORD you configured.`
        : `Demo data seeded. Login: ${DEMO_EMAIL} / ${password}`,
    );
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
