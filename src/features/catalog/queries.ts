import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { requireAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  attributeValues,
  attributes,
  brands,
  categories,
  productCategories,
  productMedia,
  productSpecifications,
  productVariantOptions,
  productVariants,
  products,
} from "@/lib/db/schema";

export async function getAdminBrands() {
  await requireAdminSession();
  return getDb().select().from(brands).orderBy(asc(brands.name));
}

export async function getAdminBrand(id: string) {
  await requireAdminSession();
  const rows = await getDb().select().from(brands).where(eq(brands.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAdminCategories() {
  await requireAdminSession();
  return getDb().select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getAdminCategory(id: string) {
  await requireAdminSession();
  const rows = await getDb()
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminAttributesWithValues() {
  await requireAdminSession();
  const attrs = await getDb()
    .select()
    .from(attributes)
    .orderBy(asc(attributes.sortOrder), asc(attributes.name));
  const values = await getDb()
    .select()
    .from(attributeValues)
    .orderBy(asc(attributeValues.sortOrder), asc(attributeValues.value));
  return attrs.map((attr) => ({
    ...attr,
    values: values.filter((v) => v.attributeId === attr.id),
  }));
}

export async function listAdminProducts(filters: {
  q?: string;
  status?: string;
  brandId?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdminSession();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (filters.q) {
    const q = `%${filters.q}%`;
    conditions.push(
      sql`(${products.name} ilike ${q} or coalesce(${products.sku}, '') ilike ${q})`,
    );
  }
  if (
    filters.status &&
    ["draft", "published", "archived"].includes(filters.status)
  ) {
    conditions.push(
      eq(
        products.status,
        filters.status as "draft" | "published" | "archived",
      ),
    );
  }
  if (filters.brandId) {
    conditions.push(eq(products.brandId, filters.brandId));
  }
  if (filters.categoryId) {
    const links = await getDb()
      .select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, filters.categoryId));
    const ids = links.map((l) => l.productId);
    if (!ids.length) {
      return { items: [], total: 0, page, pageSize };
    }
    conditions.push(inArray(products.id, ids));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const db = getDb();
  const [totalRow] = await db.select({ value: count() }).from(products).where(where);
  const items = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      status: products.status,
      priceToman: products.priceToman,
      brandId: products.brandId,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(where)
    .orderBy(desc(products.updatedAt))
    .limit(pageSize)
    .offset(offset);

  return { items, total: totalRow?.value ?? 0, page, pageSize };
}

export async function getAdminProductDetail(id: string) {
  await requireAdminSession();
  const db = getDb();
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return null;

  const categoryLinks = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.productId, id));
  const specs = await db
    .select()
    .from(productSpecifications)
    .where(eq(productSpecifications.productId, id))
    .orderBy(asc(productSpecifications.sortOrder));
  const media = await db
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, id))
    .orderBy(asc(productMedia.sortOrder));
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(asc(productVariants.createdAt));

  const variantIds = variants.map((v) => v.id);
  const options = variantIds.length
    ? await db
        .select()
        .from(productVariantOptions)
        .where(inArray(productVariantOptions.variantId, variantIds))
    : [];

  return {
    product,
    categoryIds: categoryLinks.map((c) => c.categoryId),
    primaryCategoryId:
      categoryLinks.find((c) => c.isPrimary)?.categoryId ??
      categoryLinks[0]?.categoryId ??
      null,
    specifications: specs,
    media,
    variants: variants.map((variant) => ({
      ...variant,
      attributeValueIds: options
        .filter((o) => o.variantId === variant.id)
        .map((o) => o.attributeValueId),
    })),
  };
}
