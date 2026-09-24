/**
 * Minimal schema for Phase 0 migration verification only.
 * Domain tables (products, orders, users, etc.) will be added in later phases.
 */
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const schemaHealthChecks = pgTable("schema_health_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  note: text("note").notNull().default("phase-0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type SchemaHealthCheck = typeof schemaHealthChecks.$inferSelect;
export type NewSchemaHealthCheck = typeof schemaHealthChecks.$inferInsert;
