/**
 * Apply Drizzle SQL migrations over TCP via `pg`.
 * Prefer this over `drizzle-kit migrate` on networks where Neon WebSockets time out.
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "DATABASE_URL is missing. Copy .env.example to .env.local and add your Neon connection string.",
    );
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 30_000,
  });

  try {
    const client = await pool.connect();
    try {
      const ping = await client.query(
        "select 1 as ok, current_database() as db, current_user as usr",
      );
      console.log("Connected:", ping.rows[0]);
    } finally {
      client.release();
    }

    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations applied successfully.");

    const verify = await pool.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name = 'schema_health_checks'`,
    );

    if (verify.rowCount === 1) {
      console.log("Verified: public.schema_health_checks exists.");
    } else {
      console.error("Verification failed: schema_health_checks not found.");
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed.");
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
});
