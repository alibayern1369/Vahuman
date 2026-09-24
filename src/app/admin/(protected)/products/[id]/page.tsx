import { notFound } from "next/navigation";

import { ProductForm } from "@/features/catalog/components/product-form";
import { VariantManager } from "@/features/catalog/components/variant-manager";
import {
  getAdminAttributesWithValues,
  getAdminBrands,
  getAdminCategories,
  getAdminProductDetail,
} from "@/features/catalog/queries";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, brands, categories, attrs] = await Promise.all([
    getAdminProductDetail(id),
    getAdminBrands(),
    getAdminCategories(),
    getAdminAttributesWithValues(),
  ]);
  if (!detail) notFound();

  return (
    <section className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold">ویرایش محصول</h2>
        <p className="mt-2 text-muted">{detail.product.slug}</p>
      </div>

      <ProductForm
        mode="edit"
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          id: detail.product.id,
          name: detail.product.name,
          slug: detail.product.slug,
          shortDescription: detail.product.shortDescription,
          description: detail.product.description,
          sku: detail.product.sku,
          brandId: detail.product.brandId,
          categoryIds: detail.categoryIds,
          primaryCategoryId: detail.primaryCategoryId,
          status: detail.product.status,
          priceToman: detail.product.priceToman,
          compareAtPriceToman: detail.product.compareAtPriceToman,
          trackInventory: detail.product.trackInventory,
          stockQuantity: detail.product.stockQuantity,
          isFeatured: detail.product.isFeatured,
          seoTitle: detail.product.seoTitle,
          seoDescription: detail.product.seoDescription,
          specifications: detail.specifications.map((s) => ({
            label: s.label,
            value: s.value,
            sortOrder: s.sortOrder,
          })),
          media: detail.media.map((m) => ({
            url: m.url,
            alt: m.alt,
            sortOrder: m.sortOrder,
            isPrimary: m.isPrimary,
          })),
        }}
      />

      <div>
        <h3 className="mb-4 text-xl font-bold">واریانت‌ها</h3>
        <VariantManager
          productId={detail.product.id}
          attributes={attrs.map((a) => ({
            id: a.id,
            name: a.name,
            values: a.values.map((v) => ({ id: v.id, value: v.value })),
          }))}
          variants={detail.variants}
        />
      </div>
    </section>
  );
}
