import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { requireDatabaseUrl } from "@/config/env";
import * as schema from "@/lib/db/schema";

export type Database = ReturnType<typeof createDb>;

let pool: Pool | undefined;
let cached: Database | undefined;

/**
 * Node.js PostgreSQL pool against Neon (pooled URL recommended).
 * Compatible with Better Auth + Drizzle migrations on this network.
 * Do not import this module into Edge Middleware or Client Components.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
      ssl: { rejectUnauthorized: true },
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export function createDb() {
  return drizzle(getPool(), { schema });
}

export function getDb(): Database {
  if (!cached) {
    cached = createDb();
  }
  return cached;
}
