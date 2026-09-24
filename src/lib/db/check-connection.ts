/**
 * Optional connectivity smoke test.
 * Run: pnpm db:check
 *
 * Tries Neon HTTP first, then falls back to TCP via `pg`.
 * Requires DATABASE_URL in `.env.local`. Does not invent or print credentials.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function checkViaNeonHttp(url: string) {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  const rows = await sql`select 1 as ok, current_database() as db`;
  return rows[0];
}

async function checkViaPg(url: string) {
  const pg = await import("pg");
  const pool = new pg.default.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 30_000,
  });
  try {
    const result = await pool.query(
      "select 1 as ok, current_database() as db, current_user as usr",
    );
    return result.rows[0];
  } finally {
    await pool.end();
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is missing. Copy .env.example to .env.local and add your Neon connection string.",
    );
    process.exit(1);
  }

  try {
    const row = await checkViaNeonHttp(url);
    console.log("Database connection OK (Neon HTTP):", row);
    return;
  } catch (httpError: unknown) {
    const message =
      httpError instanceof Error ? httpError.message : "unknown error";
    console.warn(`Neon HTTP check failed (${message}); trying TCP via pg...`);
  }

  try {
    const fallbackUrl = process.env.DATABASE_URL_UNPOOLED ?? url;
    const row = await checkViaPg(fallbackUrl);
    console.log("Database connection OK (pg TCP):", row);
  } catch (tcpError: unknown) {
    console.error("Database connection failed.");
    if (tcpError instanceof Error) {
      console.error(tcpError.message);
    }
    process.exit(1);
  }
}

main();
