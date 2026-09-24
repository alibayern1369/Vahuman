import { notFound } from "next/navigation";

import { CategoryForm } from "@/features/catalog/components/category-form";
import { getAdminCategories, getAdminCategory } from "@/features/catalog/queries";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, categories] = await Promise.all([
    getAdminCategory(id),
    getAdminCategories(),
  ]);
  if (!category) notFound();

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">ویرایش دسته</h2>
      <CategoryForm mode="edit" categories={categories} initial={category} />
    </section>
  );
}
