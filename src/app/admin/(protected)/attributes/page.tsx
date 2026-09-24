import { AttributesManager } from "@/features/catalog/components/attributes-manager";
import { getAdminAttributesWithValues } from "@/features/catalog/queries";

export const dynamic = "force-dynamic";

export default async function AdminAttributesPage() {
  const items = await getAdminAttributesWithValues();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">ویژگی‌ها</h2>
        <p className="mt-2 text-muted">
          تعریف ویژگی‌های قابل‌استفاده مجدد مانند رنگ، سایز و جنس
        </p>
      </div>
      <AttributesManager items={items} />
    </section>
  );
}
