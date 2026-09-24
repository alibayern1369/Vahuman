import { notFound } from "next/navigation";

import { BrandForm } from "@/features/catalog/components/brand-form";
import { getAdminBrand } from "@/features/catalog/queries";

export const dynamic = "force-dynamic";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brand = await getAdminBrand(id);
  if (!brand) notFound();

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">ویرایش برند</h2>
      <BrandForm mode="edit" initial={brand} />
    </section>
  );
}
