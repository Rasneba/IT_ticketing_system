import "dotenv/config";
import { desc, eq, isNotNull } from "drizzle-orm";
import { db, pool } from "../src/db/index";
import { tickets } from "../src/db/schema";

async function main() {
  const rows = await db
    .select({ token: tickets.publicToken, createdAt: tickets.createdAt, seq: tickets.seq })
    .from(tickets)
    .where(isNotNull(tickets.publicToken))
    .orderBy(desc(tickets.createdAt))
    .limit(3);

  for (const r of rows) {
    const utc = r.createdAt.toISOString();
    const fmt = (tz: string) =>
      new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "short", timeStyle: "short" }).format(r.createdAt);
    console.log(`seq=${r.seq} token=${r.token}`);
    console.log(`  createdAt UTC      : ${utc}`);
    console.log(`  as Africa/Nairobi  : ${fmt("Africa/Nairobi")}`);
    console.log(`  as Asia/Dubai      : ${fmt("Asia/Dubai")}`);
    console.log(`  as Europe/Lisbon   : ${fmt("Europe/Lisbon")}`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
