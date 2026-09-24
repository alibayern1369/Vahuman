/**
 * Catalog architecture notes (Phase 2)
 *
 * Pricing: INTEGER Iranian toman only. Never float. Never trust client totals.
 * Categories: nested via parent_id; products ↔ categories many-to-many.
 * Brands: first-class optional FK on products.
 * Attributes: reusable Attribute → AttributeValue; variants use combinations.
 * Variants: combination_key = sorted attribute_value ids joined by "|".
 * Inventory: product-level stock when no variants; variant-level otherwise.
 *   Reservation for checkout is deferred.
 * Media: URL/storage_key metadata only — no binaries in Postgres.
 * Specs: label/value rows for importer/AI-friendly structured data.
 * Public storefront must filter status = published only (not yet built).
 */
export const catalogArchitecture = {
  moneyUnit: "toman",
  moneyStorage: "integer",
  productCategoryRelation: "many-to-many",
} as const;
