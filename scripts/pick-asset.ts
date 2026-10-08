import "dotenv/config";
import { isNotNull } from "drizzle-orm";
import { db, pool } from "../src/db/index";
import { assets } from "../src/db/schema";

async function main() {
  const [a] = await db
    .select({ t: assets.qrToken, n: assets.name })
    .from(assets)
    .where(isNotNull(assets.qrToken))
    .limit(1);
  console.log(JSON.stringify(a));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
