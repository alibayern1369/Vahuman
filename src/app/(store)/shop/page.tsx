import Link from "next/link";
import type { Metadata } from "next";

import { ProductCard } from "@/components/storefront/product-card";
import { ShopFiltersForm } from "@/components/storefront/shop-filters";
import { appConfig } from "@/config/app";
import {
  listPublishedProducts,
  type StorefrontSort,
} from "@/lib/storefront/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `فروشگاه | ${appConfig.name}`,
  description: "مرور محصولات منتشرشده وهومن",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = first(params.q);
  const sort = (first(params.sort) as StorefrontSort) || "newest";
  const minPrice = first(params.minPrice);
  const maxPrice = first(params.maxPrice);
  const inStock = first(params.inStock) === "1";
  const page = Number(first(params.page) || "1") || 1;
  const category = first(params.category);
  const brand = first(params.brand);

  const result = await listPublishedProducts({
    q,
    sort,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    inStock: inStock || undefined,
    page,
    pageSize: 12,
    categorySlug: category,
    brandSlug: brand,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (sort) qs.set("sort", sort);
  if (minPrice) qs.set("minPrice", minPrice);
  if (maxPrice) qs.set("maxPrice", maxPrice);
  if (inStock) qs.set("inStock", "1");
  if (category) qs.set("category", category);
  if (brand) qs.set("brand", brand);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">فروشگاه</h1>
      <ShopFiltersForm
        q={q}
        sort={sort}
        minPrice={minPrice}
        maxPrice={maxPrice}
        inStock={inStock ? "1" : undefined}
        categorySlug={category}
        brandSlug={brand}
      />

      <p className="mt-4 text-sm text-muted">
        {result.total.toLocaleString("fa-IR")} محصول
      </p>

      {result.items.length ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {result.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-border px-4 py-10 text-center text-muted">
          محصولی با این فیلترها پیدا نشد.
        </p>
      )}

      <div className="mt-8 flex items-center justify-between text-sm">
        <span className="text-muted">
          صفحه {result.page.toLocaleString("fa-IR")} از{" "}
          {totalPages.toLocaleString("fa-IR")}
        </span>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              className="rounded border border-border px-3 py-1"
              href={`/shop?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(result.page - 1) }).toString()}`}
            >
              قبلی
            </Link>
          ) : null}
          {result.page < totalPages ? (
            <Link
              className="rounded border border-border px-3 py-1"
              href={`/shop?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(result.page + 1) }).toString()}`}
            >
              بعدی
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
