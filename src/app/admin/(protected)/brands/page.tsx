import Link from "next/link";

import { BrandForm } from "@/features/catalog/components/brand-form";
import { getAdminBrands } from "@/features/catalog/queries";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  const brands = await getAdminBrands();

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">برندها</h2>
          <p className="mt-2 text-muted">مدیریت برندهای کاتالوگ وهومن</p>
        </div>
        <Link href="/admin/brands/new" className="rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm text-accent-foreground">
          برند جدید
        </Link>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-medium">نام</th>
              <th className="px-4 py-3 text-start font-medium">اسلاگ</th>
              <th className="px-4 py-3 text-start font-medium">وضعیت</th>
              <th className="px-4 py-3 text-start font-medium">به‌روزرسانی</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/admin/brands/${brand.id}`} className="font-medium text-accent hover:underline">
                    {brand.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{brand.slug}</td>
                <td className="px-4 py-3">{brand.status === "active" ? "فعال" : "غیرفعال"}</td>
                <td className="px-4 py-3">{formatDate(brand.updatedAt)}</td>
              </tr>
            ))}
            {brands.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  هنوز برندی ثبت نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border p-4 lg:hidden">
        <h3 className="mb-3 font-semibold">ایجاد سریع</h3>
        <BrandForm mode="create" />
      </div>
    </section>
  );
}
