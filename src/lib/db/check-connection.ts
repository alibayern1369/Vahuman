/**
 * Optional connectivity smoke test.
 * Run: pnpm db:check
 *
 * Requires DATABASE_URL in `.env.local`. Does not invent or print credentials.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is missing. Copy .env.example to .env.local and add your Neon connection string.",
    );
    process.exit(1);
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`select 1 as ok`;
  console.log("Database connection OK:", rows[0]);
}

main().catch((error: unknown) => {
  console.error("Database connection failed.");
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
});
