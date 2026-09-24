import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { isInStock } from "@/lib/catalog/inventory";
import { getDb } from "@/lib/db";
import {
  brands,
  categories,
  productCategories,
  productMedia,
  productSpecifications,
  productVariantOptions,
  productVariants,
  products,
  attributeValues,
  attributes,
} from "@/lib/db/schema";

export type StorefrontSort =
  | "newest"
  | "price_asc"
  | "price_desc";

export type CatalogFilters = {
  q?: string;
  categorySlug?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: StorefrontSort;
  page?: number;
  pageSize?: number;
};

function publishedOnly() {
  return eq(products.status, "published");
}

export async function getPublishedProductCardByIds(ids: string[]) {
  if (!ids.length) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      priceToman: products.priceToman,
      compareAtPriceToman: products.compareAtPriceToman,
      trackInventory: products.trackInventory,
      stockQuantity: products.stockQuantity,
      brandName: brands.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(publishedOnly(), inArray(products.id, ids)));

  const media = await db
    .select()
    .from(productMedia)
    .where(and(inArray(productMedia.productId, ids), eq(productMedia.isPrimary, true)));

  return rows.map((row) => ({
    ...row,
    primaryImageUrl: media.find((m) => m.productId === row.id)?.url ?? null,
    primaryImageAlt: media.find((m) => m.productId === row.id)?.alt ?? row.name,
    inStock: isInStock({
      trackInventory: row.trackInventory,
      stockQuantity: row.stockQuantity,
    }),
  }));
}

export async function listPublishedProducts(filters: CatalogFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));
  const offset = (page - 1) * pageSize;
  const db = getDb();
  const conditions = [publishedOnly()];

  if (filters.q) {
    const q = `%${filters.q}%`;
    conditions.push(
      sql`(
        ${products.name} ilike ${q}
        or coalesce(${products.sku}, '') ilike ${q}
        or coalesce(${brands.name}, '') ilike ${q}
      )`,
    );
  }
  if (filters.minPrice != null) {
    conditions.push(gte(products.priceToman, filters.minPrice));
  }
  if (filters.maxPrice != null) {
    conditions.push(lte(products.priceToman, filters.maxPrice));
  }
  if (filters.inStock) {
    conditions.push(
      or(
        eq(products.trackInventory, false),
        gte(products.stockQuantity, 1),
      )!,
    );
  }

  if (filters.categorySlug) {
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.slug, filters.categorySlug), eq(categories.status, "active")),
      )
      .limit(1);
    if (!cat[0]) {
      return { items: [], total: 0, page, pageSize };
    }
    const links = await db
      .select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, cat[0].id));
    const ids = links.map((l) => l.productId);
    if (!ids.length) return { items: [], total: 0, page, pageSize };
    conditions.push(inArray(products.id, ids));
  }

  if (filters.brandSlug) {
    const brand = await db
      .select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.slug, filters.brandSlug), eq(brands.status, "active")))
      .limit(1);
    if (!brand[0]) return { items: [], total: 0, page, pageSize };
    conditions.push(eq(products.brandId, brand[0].id));
  }

  const where = and(...conditions);
  const orderBy =
    filters.sort === "price_asc"
      ? asc(products.priceToman)
      : filters.sort === "price_desc"
        ? desc(products.priceToman)
        : desc(products.publishedAt);

  const [totalRow] = await db
    .select({ value: count() })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(where);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      priceToman: products.priceToman,
      compareAtPriceToman: products.compareAtPriceToman,
      trackInventory: products.trackInventory,
      stockQuantity: products.stockQuantity,
      brandName: brands.name,
      publishedAt: products.publishedAt,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(where)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset);

  const ids = rows.map((r) => r.id);
  const media = ids.length
    ? await db
        .select()
        .from(productMedia)
        .where(and(inArray(productMedia.productId, ids), eq(productMedia.isPrimary, true)))
    : [];

  const items = rows.map((row) => ({
    ...row,
    primaryImageUrl: media.find((m) => m.productId === row.id)?.url ?? null,
    primaryImageAlt: media.find((m) => m.productId === row.id)?.alt ?? row.name,
    inStock: isInStock({
      trackInventory: row.trackInventory,
      stockQuantity: row.stockQuantity,
    }),
  }));

  return { items, total: totalRow?.value ?? 0, page, pageSize };
}

export async function getPublishedProductBySlug(slug: string) {
  const db = getDb();
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      shortDescription: products.shortDescription,
      description: products.description,
      sku: products.sku,
      priceToman: products.priceToman,
      compareAtPriceToman: products.compareAtPriceToman,
      trackInventory: products.trackInventory,
      stockQuantity: products.stockQuantity,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      brandId: products.brandId,
      brandName: brands.name,
      brandSlug: brands.slug,
      status: products.status,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.slug, slug), publishedOnly()))
    .limit(1);

  if (!product) return null;

  const [media, specs, categoryLinks, variants] = await Promise.all([
    db
      .select()
      .from(productMedia)
      .where(eq(productMedia.productId, product.id))
      .orderBy(asc(productMedia.sortOrder)),
    db
      .select()
      .from(productSpecifications)
      .where(eq(productSpecifications.productId, product.id))
      .orderBy(asc(productSpecifications.sortOrder)),
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(eq(productCategories.productId, product.id)),
    db
      .select()
      .from(productVariants)
      .where(
        and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)),
      )
      .orderBy(asc(productVariants.createdAt)),
  ]);

  const variantIds = variants.map((v) => v.id);
  const options = variantIds.length
    ? await db
        .select({
          variantId: productVariantOptions.variantId,
          attributeValueId: productVariantOptions.attributeValueId,
          value: attributeValues.value,
          attributeId: attributeValues.attributeId,
          attributeName: attributes.name,
          metadata: attributeValues.metadata,
        })
        .from(productVariantOptions)
        .innerJoin(
          attributeValues,
          eq(productVariantOptions.attributeValueId, attributeValues.id),
        )
        .innerJoin(attributes, eq(attributeValues.attributeId, attributes.id))
        .where(inArray(productVariantOptions.variantId, variantIds))
    : [];

  return {
    product: {
      ...product,
      inStock: isInStock({
        trackInventory: product.trackInventory,
        stockQuantity: product.stockQuantity,
      }),
    },
    media,
    specifications: specs,
    categories: categoryLinks,
    variants: variants.map((variant) => ({
      ...variant,
      unitPriceToman: variant.priceToman ?? product.priceToman,
      compareAtPriceToman:
        variant.compareAtPriceToman ?? product.compareAtPriceToman,
      inStock: isInStock({
        trackInventory: product.trackInventory,
        stockQuantity: variant.stockQuantity,
      }),
      options: options.filter((o) => o.variantId === variant.id),
    })),
  };
}

export async function getActiveCategoryBySlug(slug: string) {
  const [row] = await getDb()
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.status, "active")))
    .limit(1);
  return row ?? null;
}

export async function getActiveBrandBySlug(slug: string) {
  const [row] = await getDb()
    .select()
    .from(brands)
    .where(and(eq(brands.slug, slug), eq(brands.status, "active")))
    .limit(1);
  return row ?? null;
}

export async function getHomepageData() {
  const db = getDb();
  const [featured, newest, activeCategories, activeBrands] = await Promise.all([
    listPublishedProducts({ sort: "newest", pageSize: 8 }).then(async (res) => {
      const featuredRows = await db
        .select({ id: products.id })
        .from(products)
        .where(and(publishedOnly(), eq(products.isFeatured, true)))
        .orderBy(desc(products.publishedAt))
        .limit(8);
      const ids = featuredRows.map((r) => r.id);
      return ids.length ? getPublishedProductCardByIds(ids) : res.items.slice(0, 8);
    }),
    listPublishedProducts({ sort: "newest", pageSize: 8 }),
    db
      .select()
      .from(categories)
      .where(eq(categories.status, "active"))
      .orderBy(asc(categories.sortOrder), asc(categories.name))
      .limit(12),
    db
      .select()
      .from(brands)
      .where(eq(brands.status, "active"))
      .orderBy(asc(brands.name))
      .limit(12),
  ]);

  return {
    featured,
    newest: newest.items,
    categories: activeCategories,
    brands: activeBrands,
  };
}

export async function listPublishedProductSlugs() {
  return getDb()
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(publishedOnly());
}

export async function listActiveCategorySlugs() {
  return getDb()
    .select({ slug: categories.slug, updatedAt: categories.updatedAt })
    .from(categories)
    .where(eq(categories.status, "active"));
}

export async function listActiveBrandSlugs() {
  return getDb()
    .select({ slug: brands.slug, updatedAt: brands.updatedAt })
    .from(brands)
    .where(eq(brands.status, "active"));
}

// silence unused
void ilike;
void asc;
