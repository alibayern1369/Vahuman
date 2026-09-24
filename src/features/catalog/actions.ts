"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  ActionResult,
  withAdminAction,
  zodErrorMessage,
} from "@/features/catalog/action-utils";
import {
  attributeInputSchema,
  attributeValueInputSchema,
  brandInputSchema,
  categoryInputSchema,
  productInputSchema,
  variantGenerateSchema,
  variantUpdateSchema,
} from "@/features/catalog/schemas";
import { wouldCreateCategoryCycle } from "@/lib/catalog/category-tree";
import { ensureUniqueSlug } from "@/lib/catalog/slug";
import {
  buildCombinationKey,
  cartesianProduct,
} from "@/lib/catalog/variants";
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

function revalidateCatalog() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/attributes");
}

async function uniqueBrandSlug(desired: string, excludeId?: string) {
  return ensureUniqueSlug(desired, async (slug) => {
    const rows = await getDb()
      .select({ id: brands.id })
      .from(brands)
      .where(
        excludeId
          ? and(eq(brands.slug, slug), ne(brands.id, excludeId))
          : eq(brands.slug, slug),
      )
      .limit(1);
    return rows.length > 0;
  });
}

async function uniqueCategorySlug(desired: string, excludeId?: string) {
  return ensureUniqueSlug(desired, async (slug) => {
    const rows = await getDb()
      .select({ id: categories.id })
      .from(categories)
      .where(
        excludeId
          ? and(eq(categories.slug, slug), ne(categories.id, excludeId))
          : eq(categories.slug, slug),
      )
      .limit(1);
    return rows.length > 0;
  });
}

async function uniqueAttributeSlug(desired: string, excludeId?: string) {
  return ensureUniqueSlug(desired, async (slug) => {
    const rows = await getDb()
      .select({ id: attributes.id })
      .from(attributes)
      .where(
        excludeId
          ? and(eq(attributes.slug, slug), ne(attributes.id, excludeId))
          : eq(attributes.slug, slug),
      )
      .limit(1);
    return rows.length > 0;
  });
}

async function uniqueProductSlug(desired: string, excludeId?: string) {
  return ensureUniqueSlug(desired, async (slug) => {
    const rows = await getDb()
      .select({ id: products.id })
      .from(products)
      .where(
        excludeId
          ? and(eq(products.slug, slug), ne(products.id, excludeId))
          : eq(products.slug, slug),
      )
      .limit(1);
    return rows.length > 0;
  });
}

/* --------------------------------- Brands --------------------------------- */

export async function createBrand(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return withAdminAction(async () => {
    const parsed = brandInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    const slug = await uniqueBrandSlug(data.slug || data.name);
    const [row] = await getDb()
      .insert(brands)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        status: data.status,
      })
      .returning({ id: brands.id });
    revalidateCatalog();
    return { ok: true, data: row, message: "برند ایجاد شد." };
  });
}

export async function updateBrand(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  return withAdminAction(async () => {
    const parsed = brandInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    const slug = await uniqueBrandSlug(data.slug || data.name, id);
    await getDb()
      .update(brands)
      .set({
        name: data.name,
        slug,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id));
    revalidateCatalog();
    return { ok: true, message: "برند به‌روزرسانی شد." };
  });
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  return withAdminAction(async () => {
    const linked = await getDb()
      .select({ id: products.id })
      .from(products)
      .where(eq(products.brandId, id))
      .limit(1);
    if (linked.length) {
      return {
        ok: false,
        error: "این برند به محصول متصل است و قابل حذف نیست.",
      };
    }
    await getDb().delete(brands).where(eq(brands.id, id));
    revalidateCatalog();
    return { ok: true, message: "برند حذف شد." };
  });
}

/* ------------------------------- Categories ------------------------------- */

export async function createCategory(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return withAdminAction(async () => {
    const parsed = categoryInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    if (data.parentId) {
      const parent = await getDb()
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, data.parentId))
        .limit(1);
      if (!parent.length) return { ok: false, error: "دسته والد یافت نشد." };
    }
    const slug = await uniqueCategorySlug(data.slug || data.name);
    const [row] = await getDb()
      .insert(categories)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        parentId: data.parentId || null,
        status: data.status,
        sortOrder: data.sortOrder,
      })
      .returning({ id: categories.id });
    revalidateCatalog();
    return { ok: true, data: row, message: "دسته ایجاد شد." };
  });
}

export async function updateCategory(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  return withAdminAction(async () => {
    const parsed = categoryInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    const all = await getDb()
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories);
    if (
      wouldCreateCategoryCycle(all, id, data.parentId ?? null)
    ) {
      return { ok: false, error: "انتخاب این والد باعث حلقه در دسته‌ها می‌شود." };
    }
    const slug = await uniqueCategorySlug(data.slug || data.name, id);
    await getDb()
      .update(categories)
      .set({
        name: data.name,
        slug,
        description: data.description || null,
        parentId: data.parentId || null,
        status: data.status,
        sortOrder: data.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id));
    revalidateCatalog();
    return { ok: true, message: "دسته به‌روزرسانی شد." };
  });
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  return withAdminAction(async () => {
    const children = await getDb()
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, id))
      .limit(1);
    if (children.length) {
      return { ok: false, error: "ابتدا زیردسته‌ها را حذف یا جابه‌جا کنید." };
    }
    const linked = await getDb()
      .select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, id))
      .limit(1);
    if (linked.length) {
      return {
        ok: false,
        error: "این دسته به محصول متصل است و قابل حذف نیست.",
      };
    }
    await getDb().delete(categories).where(eq(categories.id, id));
    revalidateCatalog();
    return { ok: true, message: "دسته حذف شد." };
  });
}

/* ------------------------------- Attributes ------------------------------- */

export async function createAttribute(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return withAdminAction(async () => {
    const parsed = attributeInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    const slug = await uniqueAttributeSlug(data.slug || data.name);
    const [row] = await getDb()
      .insert(attributes)
      .values({
        name: data.name,
        slug,
        sortOrder: data.sortOrder,
        status: data.status,
      })
      .returning({ id: attributes.id });
    revalidateCatalog();
    return { ok: true, data: row, message: "ویژگی ایجاد شد." };
  });
}

export async function updateAttribute(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  return withAdminAction(async () => {
    const parsed = attributeInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    const slug = await uniqueAttributeSlug(data.slug || data.name, id);
    await getDb()
      .update(attributes)
      .set({
        name: data.name,
        slug,
        sortOrder: data.sortOrder,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(attributes.id, id));
    revalidateCatalog();
    return { ok: true, message: "ویژگی به‌روزرسانی شد." };
  });
}

export async function deleteAttribute(id: string): Promise<ActionResult> {
  return withAdminAction(async () => {
    const values = await getDb()
      .select({ id: attributeValues.id })
      .from(attributeValues)
      .where(eq(attributeValues.attributeId, id));
    if (values.length) {
      const valueIds = values.map((v) => v.id);
      const used = await getDb()
        .select({ variantId: productVariantOptions.variantId })
        .from(productVariantOptions)
        .where(inArray(productVariantOptions.attributeValueId, valueIds))
        .limit(1);
      if (used.length) {
        return {
          ok: false,
          error: "این ویژگی در واریانت‌ها استفاده شده و قابل حذف نیست.",
        };
      }
      await getDb()
        .delete(attributeValues)
        .where(eq(attributeValues.attributeId, id));
    }
    await getDb().delete(attributes).where(eq(attributes.id, id));
    revalidateCatalog();
    return { ok: true, message: "ویژگی حذف شد." };
  });
}

export async function createAttributeValue(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return withAdminAction(async () => {
    const parsed = attributeValueInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    const slug = await ensureUniqueSlug(data.slug || data.value, async (candidate) => {
      const rows = await getDb()
        .select({ id: attributeValues.id })
        .from(attributeValues)
        .where(
          and(
            eq(attributeValues.attributeId, data.attributeId),
            eq(attributeValues.slug, candidate),
          ),
        )
        .limit(1);
      return rows.length > 0;
    });
    const metadata = data.hex ? { hex: data.hex } : null;
    const [row] = await getDb()
      .insert(attributeValues)
      .values({
        attributeId: data.attributeId,
        value: data.value,
        slug,
        metadata,
        sortOrder: data.sortOrder,
        status: data.status,
      })
      .returning({ id: attributeValues.id });
    revalidateCatalog();
    return { ok: true, data: row, message: "مقدار ویژگی ایجاد شد." };
  });
}

export async function deleteAttributeValue(id: string): Promise<ActionResult> {
  return withAdminAction(async () => {
    const used = await getDb()
      .select({ variantId: productVariantOptions.variantId })
      .from(productVariantOptions)
      .where(eq(productVariantOptions.attributeValueId, id))
      .limit(1);
    if (used.length) {
      return {
        ok: false,
        error: "این مقدار در واریانت استفاده شده و قابل حذف نیست.",
      };
    }
    await getDb().delete(attributeValues).where(eq(attributeValues.id, id));
    revalidateCatalog();
    return { ok: true, message: "مقدار ویژگی حذف شد." };
  });
}

/* -------------------------------- Products -------------------------------- */

async function syncProductRelations(
  productId: string,
  input: {
    categoryIds: string[];
    primaryCategoryId?: string | null;
    specifications: Array<{ label: string; value: string; sortOrder: number }>;
    media: Array<{
      url: string;
      alt?: string | null;
      sortOrder: number;
      isPrimary: boolean;
    }>;
  },
) {
  const db = getDb();
  await db
    .delete(productCategories)
    .where(eq(productCategories.productId, productId));
  if (input.categoryIds.length) {
    const primary =
      input.primaryCategoryId &&
      input.categoryIds.includes(input.primaryCategoryId)
        ? input.primaryCategoryId
        : input.categoryIds[0];
    await db.insert(productCategories).values(
      input.categoryIds.map((categoryId) => ({
        productId,
        categoryId,
        isPrimary: categoryId === primary,
      })),
    );
  }

  await db
    .delete(productSpecifications)
    .where(eq(productSpecifications.productId, productId));
  if (input.specifications.length) {
    await db.insert(productSpecifications).values(
      input.specifications.map((spec, index) => ({
        productId,
        label: spec.label,
        value: spec.value,
        sortOrder: spec.sortOrder ?? index,
      })),
    );
  }

  await db.delete(productMedia).where(eq(productMedia.productId, productId));
  if (input.media.length) {
    const hasPrimary = input.media.some((m) => m.isPrimary);
    await db.insert(productMedia).values(
      input.media.map((item, index) => ({
        productId,
        url: item.url,
        alt: item.alt || null,
        sortOrder: item.sortOrder ?? index,
        isPrimary: hasPrimary ? item.isPrimary : index === 0,
      })),
    );
  }
}

export async function createProduct(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return withAdminAction(async () => {
    const parsed = productInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    const slug = await uniqueProductSlug(data.slug || data.name);
    const sku = data.sku ? data.sku : null;
    const publishedAt = data.status === "published" ? new Date() : null;

    const [row] = await getDb()
      .insert(products)
      .values({
        name: data.name,
        slug,
        shortDescription: data.shortDescription || null,
        description: data.description || null,
        sku,
        brandId: data.brandId || null,
        status: data.status,
        priceToman: data.priceToman,
        compareAtPriceToman: data.compareAtPriceToman ?? null,
        trackInventory: data.trackInventory,
        stockQuantity: data.stockQuantity,
        isFeatured: data.isFeatured,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        publishedAt,
      })
      .returning({ id: products.id });

    await syncProductRelations(row.id, data);
    revalidateCatalog();
    return { ok: true, data: row, message: "محصول ایجاد شد." };
  });
}

export async function updateProduct(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  return withAdminAction(async () => {
    const parsed = productInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    const existing = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (!existing[0]) return { ok: false, error: "محصول یافت نشد." };

    const slug = await uniqueProductSlug(data.slug || data.name, id);
    let publishedAt = existing[0].publishedAt;
    if (data.status === "published" && !publishedAt) {
      publishedAt = new Date();
    }
    if (data.status !== "published") {
      // keep historical publishedAt when archiving/drafting
    }

    await getDb()
      .update(products)
      .set({
        name: data.name,
        slug,
        shortDescription: data.shortDescription || null,
        description: data.description || null,
        sku: data.sku || null,
        brandId: data.brandId || null,
        status: data.status,
        priceToman: data.priceToman,
        compareAtPriceToman: data.compareAtPriceToman ?? null,
        trackInventory: data.trackInventory,
        stockQuantity: data.stockQuantity,
        isFeatured: data.isFeatured,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    await syncProductRelations(id, data);
    revalidateCatalog();
    return { ok: true, message: "محصول به‌روزرسانی شد." };
  });
}

export async function setProductStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  return withAdminAction(async () => {
    const existing = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (!existing[0]) return { ok: false, error: "محصول یافت نشد." };
    await getDb()
      .update(products)
      .set({
        status,
        publishedAt:
          status === "published"
            ? existing[0].publishedAt ?? new Date()
            : existing[0].publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));
    revalidateCatalog();
    return { ok: true, message: "وضعیت محصول تغییر کرد." };
  });
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  return withAdminAction(async () => {
    const existing = await getDb()
      .select({ status: products.status })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (!existing[0]) return { ok: false, error: "محصول یافت نشد." };
    if (existing[0].status === "published") {
      return {
        ok: false,
        error: "محصول منتشرشده را ابتدا بایگانی کنید، سپس حذف کنید.",
      };
    }
    await getDb().delete(products).where(eq(products.id, id));
    revalidateCatalog();
    return { ok: true, message: "محصول حذف شد." };
  });
}

/* -------------------------------- Variants -------------------------------- */

export async function generateProductVariants(
  raw: unknown,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  return withAdminAction(async () => {
    const parsed = variantGenerateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const { productId, attributeValueIdsByAttribute } = parsed.data;
    const lists = Object.values(attributeValueIdsByAttribute);
    const combos = cartesianProduct(lists);
    if (!combos.length) {
      return { ok: false, error: "هیچ ترکیبی برای تولید واریانت وجود ندارد." };
    }

    const valueRows = await getDb()
      .select()
      .from(attributeValues)
      .where(
        inArray(
          attributeValues.id,
          combos.flat(),
        ),
      );
    const valueMap = new Map(valueRows.map((v) => [v.id, v]));

    let created = 0;
    let skipped = 0;
    const db = getDb();

    for (const combo of combos) {
      const combinationKey = buildCombinationKey(combo);
      const existing = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, productId),
            eq(productVariants.combinationKey, combinationKey),
          ),
        )
        .limit(1);
      if (existing.length) {
        skipped += 1;
        continue;
      }

      const title = combo
        .map((id) => valueMap.get(id)?.value)
        .filter(Boolean)
        .join(" / ");

      const [variant] = await db
        .insert(productVariants)
        .values({
          productId,
          combinationKey,
          title,
          stockQuantity: 0,
          isActive: true,
        })
        .returning({ id: productVariants.id });

      await db.insert(productVariantOptions).values(
        combo.map((attributeValueId) => ({
          variantId: variant.id,
          attributeValueId,
        })),
      );
      created += 1;
    }

    revalidateCatalog();
    return {
      ok: true,
      data: { created, skipped },
      message: `${created} واریانت ایجاد شد (${skipped} تکراری نادیده گرفته شد).`,
    };
  });
}

export async function updateVariant(raw: unknown): Promise<ActionResult> {
  return withAdminAction(async () => {
    const parsed = variantUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: zodErrorMessage(parsed.error) };
    const data = parsed.data;
    if (
      data.compareAtPriceToman != null &&
      data.priceToman != null &&
      data.compareAtPriceToman > 0 &&
      data.compareAtPriceToman < data.priceToman
    ) {
      return {
        ok: false,
        error: "قیمت قبلی واریانت نباید کمتر از قیمت فروش باشد.",
      };
    }
    await getDb()
      .update(productVariants)
      .set({
        sku: data.sku || null,
        priceToman: data.priceToman ?? null,
        compareAtPriceToman: data.compareAtPriceToman ?? null,
        stockQuantity: data.stockQuantity,
        isActive: data.isActive,
        title: data.title || null,
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, data.id));
    revalidateCatalog();
    return { ok: true, message: "واریانت به‌روزرسانی شد." };
  });
}

export async function deleteVariant(id: string): Promise<ActionResult> {
  return withAdminAction(async () => {
    await getDb().delete(productVariants).where(eq(productVariants.id, id));
    revalidateCatalog();
    return { ok: true, message: "واریانت حذف شد." };
  });
}
