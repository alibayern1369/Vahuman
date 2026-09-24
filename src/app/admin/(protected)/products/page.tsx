import Link from "next/link";

import {
  getAdminBrands,
  getAdminCategories,
  listAdminProducts,
} from "@/features/catalog/queries";
import { formatDate, formatToman } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  draft: "پیش‌نویس",
  published: "منتشرشده",
  archived: "بایگانی",
};

type SearchParams = Promise<{
  q?: string;
  status?: string;
  brandId?: string;
  categoryId?: string;
  page?: string;
}>;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Number(params.page || "1") || 1;
  const [result, brands, categories] = await Promise.all([
    listAdminProducts({
      q: params.q,
      status: params.status,
      brandId: params.brandId,
      categoryId: params.categoryId,
      page,
      pageSize: 20,
    }),
    getAdminBrands(),
    getAdminCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">محصولات</h2>
          <p className="mt-2 text-muted">مدیریت کاتالوگ محصولات وهومن</p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm text-accent-foreground"
        >
          محصول جدید
        </Link>
      </div>

      <form className="grid gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 md:grid-cols-5">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="جستجو نام یا SKU"
          className="rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm md:col-span-2"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="draft">پیش‌نویس</option>
          <option value="published">منتشرشده</option>
          <option value="archived">بایگانی</option>
        </select>
        <select
          name="brandId"
          defaultValue={params.brandId ?? ""}
          className="rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">همه برندها</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          name="categoryId"
          defaultValue={params.categoryId ?? ""}
          className="rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">همه دسته‌ها</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm text-accent-foreground md:col-span-5 md:w-fit"
        >
          اعمال فیلتر
        </button>
      </form>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-medium">نام</th>
              <th className="px-4 py-3 text-start font-medium">SKU</th>
              <th className="px-4 py-3 text-start font-medium">قیمت</th>
              <th className="px-4 py-3 text-start font-medium">وضعیت</th>
              <th className="px-4 py-3 text-start font-medium">به‌روزرسانی</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/products/${item.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.sku || "—"}</td>
                <td className="px-4 py-3">{formatToman(item.priceToman)}</td>
                <td className="px-4 py-3">{statusLabel[item.status] ?? item.status}</td>
                <td className="px-4 py-3">{formatDate(item.updatedAt)}</td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  محصولی یافت نشد.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          صفحه {result.page.toLocaleString("fa-IR")} از{" "}
          {totalPages.toLocaleString("fa-IR")} · مجموع{" "}
          {result.total.toLocaleString("fa-IR")}
        </span>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              className="rounded border border-border px-3 py-1"
              href={`/admin/products?page=${result.page - 1}`}
            >
              قبلی
            </Link>
          ) : null}
          {result.page < totalPages ? (
            <Link
              className="rounded border border-border px-3 py-1"
              href={`/admin/products?page=${result.page + 1}`}
            >
              بعدی
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
