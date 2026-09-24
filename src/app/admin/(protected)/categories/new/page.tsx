import { CategoryForm } from "@/features/catalog/components/category-form";
import { getAdminCategories } from "@/features/catalog/queries";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  const categories = await getAdminCategories();
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">دسته جدید</h2>
      <CategoryForm mode="create" categories={categories} />
    </section>
  );
}
