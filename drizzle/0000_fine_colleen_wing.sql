CREATE TABLE "schema_health_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text DEFAULT 'phase-0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
