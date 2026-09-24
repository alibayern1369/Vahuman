import { ProductForm } from "@/features/catalog/components/product-form";
import { getAdminBrands, getAdminCategories } from "@/features/catalog/queries";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([
    getAdminBrands(),
    getAdminCategories(),
  ]);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">محصول جدید</h2>
      <ProductForm
        mode="create"
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </section>
  );
}
