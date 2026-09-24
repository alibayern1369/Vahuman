import { BrandForm } from "@/features/catalog/components/brand-form";

export const dynamic = "force-dynamic";

export default function NewBrandPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">برند جدید</h2>
      <BrandForm mode="create" />
    </section>
  );
}
