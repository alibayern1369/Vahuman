import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/storefront/product-card";
import { ShopFiltersForm } from "@/components/storefront/shop-filters";
import { appConfig } from "@/config/app";
import {
  getActiveCategoryBySlug,
  listPublishedProducts,
  type StorefrontSort,
} from "@/lib/storefront/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getActiveCategoryBySlug(slug);
  if (!category) return { title: "دسته یافت نشد" };
  return {
    title: `${category.name} | ${appConfig.name}`,
    description: category.description || `محصولات دسته ${category.name}`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/category/${category.slug}`,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const category = await getActiveCategoryBySlug(slug);
  if (!category) notFound();

  const sp = await searchParams;
  const result = await listPublishedProducts({
    categorySlug: slug,
    q: first(sp.q),
    sort: (first(sp.sort) as StorefrontSort) || "newest",
    minPrice: first(sp.minPrice) ? Number(first(sp.minPrice)) : undefined,
    maxPrice: first(sp.maxPrice) ? Number(first(sp.maxPrice)) : undefined,
    inStock: first(sp.inStock) === "1" || undefined,
    page: Number(first(sp.page) || "1") || 1,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold">{category.name}</h1>
      {category.description ? (
        <p className="mb-6 text-muted">{category.description}</p>
      ) : null}
      <ShopFiltersForm
        action={`/category/${slug}`}
        q={first(sp.q)}
        sort={first(sp.sort)}
        minPrice={first(sp.minPrice)}
        maxPrice={first(sp.maxPrice)}
        inStock={first(sp.inStock) === "1" ? "1" : undefined}
      />
      {result.items.length ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {result.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-muted">محصولی در این دسته نیست.</p>
      )}
    </div>
  );
}
