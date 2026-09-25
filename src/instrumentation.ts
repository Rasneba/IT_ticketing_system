export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureDatabaseReady } = await import("./db/bootstrap");
      await ensureDatabaseReady();
    } catch (err) {
      console.error("[instrumentation] database bootstrap skipped", err);
    }
  }
}
