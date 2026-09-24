-- Phase 2 catalog expansion (safe for existing Phase 1 auth + catalog rows)
CREATE TYPE "public"."entity_status" AS ENUM('active', 'inactive');--> statement-breakpoint

CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"status" "entity_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "entity_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attribute_id" uuid NOT NULL,
	"value" text NOT NULL,
	"slug" text NOT NULL,
	"metadata" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "entity_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "categories" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "status" "entity_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
UPDATE "categories"
SET "status" = CASE WHEN "is_active" THEN 'active'::"entity_status" ELSE 'inactive'::"entity_status" END;--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "products" ADD COLUMN "brand_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "short_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "compare_at_price_toman" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "track_inventory" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);--> statement-breakpoint

INSERT INTO "product_categories" ("product_id", "category_id", "is_primary")
SELECT "id", "category_id", true
FROM "products"
WHERE "category_id" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "products" DROP CONSTRAINT "products_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "category_id";--> statement-breakpoint

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text,
	"combination_key" text NOT NULL,
	"title" text,
	"price_toman" integer,
	"compare_at_price_toman" integer,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "product_variant_options" (
	"variant_id" uuid NOT NULL,
	"attribute_value_id" uuid NOT NULL,
	CONSTRAINT "product_variant_options_variant_id_attribute_value_id_pk" PRIMARY KEY("variant_id","attribute_value_id")
);--> statement-breakpoint

CREATE TABLE "product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"url" text NOT NULL,
	"storage_key" text,
	"alt" text,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "product_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_attribute_value_id_attribute_values_id_fk" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."attribute_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "brands_slug_uidx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "brands_status_idx" ON "brands" USING btree ("status");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_status_idx" ON "categories" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "attributes_slug_uidx" ON "attributes" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_values_attr_slug_uidx" ON "attribute_values" USING btree ("attribute_id","slug");--> statement-breakpoint
CREATE INDEX "attribute_values_attribute_idx" ON "attribute_values" USING btree ("attribute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_uidx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "product_categories_category_idx" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_one_primary_uidx" ON "product_categories" ("product_id") WHERE "is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_combination_uidx" ON "product_variants" USING btree ("product_id","combination_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_uidx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variant_options_value_idx" ON "product_variant_options" USING btree ("attribute_value_id");--> statement-breakpoint
CREATE INDEX "product_media_product_idx" ON "product_media" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_media_variant_idx" ON "product_media" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "product_specifications_product_idx" ON "product_specifications" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_specifications_label_uidx" ON "product_specifications" USING btree ("product_id","label");
