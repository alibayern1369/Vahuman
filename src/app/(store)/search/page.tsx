import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/storefront/product-card";
import { appConfig } from "@/config/app";
import { listPublishedProducts } from "@/lib/storefront/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `جستجو | ${appConfig.name}`,
  description: "جستجوی محصولات وهومن",
};

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const page = Number(params.page || "1") || 1;
  const result = q
    ? await listPublishedProducts({ q, page, pageSize: 12, sort: "newest" })
    : { items: [], total: 0, page: 1, pageSize: 12 };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">جستجو</h1>
      <form className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="q">
          عبارت جستجو
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="نام محصول، SKU یا برند"
          className="flex-1 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3"
        />
        <button
          type="submit"
          className="rounded-[var(--radius-lg)] bg-accent px-5 py-3 text-sm text-accent-foreground"
        >
          جستجو
        </button>
      </form>

      {!q ? (
        <p className="mt-8 text-muted">عبارت جستجو را وارد کنید.</p>
      ) : result.items.length === 0 ? (
        <p className="mt-8 text-muted">نتیجه‌ای برای «{q}» پیدا نشد.</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted">
            {result.total.toLocaleString("fa-IR")} نتیجه
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {result.page * result.pageSize < result.total ? (
            <div className="mt-6">
              <Link
                href={`/search?q=${encodeURIComponent(q)}&page=${result.page + 1}`}
                className="text-sm text-accent hover:underline"
              >
                نتایج بیشتر
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
