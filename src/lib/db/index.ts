import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { requireDatabaseUrl } from "@/config/env";
import * as schema from "@/lib/db/schema";

/**
 * Neon HTTP driver — suitable for Vercel serverless / Next.js route handlers.
 * Do not reuse Node `pg` Pool on the Edge runtime.
 */
export function createDb() {
  const sql = neon(requireDatabaseUrl());
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;

let cached: Database | undefined;

/**
 * Lazy singleton for the current process.
 * On Vercel, a new isolate may create a new client — that is expected.
 */
export function getDb(): Database {
  if (!cached) {
    cached = createDb();
  }
  return cached;
}
