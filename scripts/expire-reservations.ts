/**
 * CLI: pnpm orders:expire
 * Portable background job for unpaid reservation cleanup.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { expireUnpaidReservations } = await import("@/lib/orders/expire");
  const { getPool } = await import("@/lib/db");
  const result = await expireUnpaidReservations();
  console.log("expireUnpaidReservations:", result);
  await getPool().end();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    const { getPool } = await import("@/lib/db");
    await getPool().end();
  } catch {
    // ignore
  }
  process.exit(1);
});
