/**
 * CLI seeder:  npx tsx src/db/seed.ts          (seed only if empty)
 *              npx tsx src/db/seed.ts --reset  (truncate + reseed)
 */
import "dotenv/config";
import { sql } from "drizzle-orm";

async function main() {
  const { db, pool } = await import("./index");
  const { seedDatabase } = await import("./seed-data");
  const { users } = await import("./schema");
  const reset = process.argv.includes("--reset");

  if (reset) {
    await db.execute(
      sql`truncate table audit_logs, api_keys, meter_readings, ticket_notes, tickets, sessions, assets, users, units restart identity cascade`,
    );
    console.log("Tables truncated.");
  }

  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(users);
  if (n > 0) {
    console.log(`Database already contains ${n} users — skipping (use --reset to reseed).`);
  } else {
    await seedDatabase(db);
    console.log("Demo data seeded. Login: admin@marina.local / demo1234");
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
