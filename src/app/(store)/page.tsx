import Link from "next/link";
import type { Metadata } from "next";

import { ProductCard } from "@/components/storefront/product-card";
import { appConfig } from "@/config/app";
import { getHomepageData } from "@/lib/storefront/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${appConfig.name} | فروشگاه اینترنتی`,
  description: "فروشگاه اینترنتی وهومن — کشف محصولات منتخب",
};

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_55%),linear-gradient(180deg,var(--surface),var(--background))]" />
        <div className="relative mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
          <p className="mb-3 text-sm tracking-[0.25em] text-muted">{appConfig.nameLatin}</p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
            {appConfig.name}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
            تجربه خرید فارسی و راست‌چین با کاتالوگ واقعی محصولات منتشرشده.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-[var(--radius-lg)] bg-accent px-5 py-3 text-sm font-medium text-accent-foreground"
            >
              مشاهده فروشگاه
            </Link>
            <Link
              href="/search"
              className="rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-3 text-sm"
            >
              جستجو
            </Link>
          </div>
        </div>
      </section>

      <Section title="محصولات ویژه" href="/shop">
        <ProductGrid products={data.featured} empty="هنوز محصول ویژه‌ای منتشر نشده است." />
      </Section>

      <Section title="جدیدترین‌ها" href="/shop?sort=newest">
        <ProductGrid products={data.newest} empty="هنوز محصولی منتشر نشده است." />
      </Section>

      <Section title="دسته‌ها" href="/shop">
        {data.categories.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-5 text-sm font-medium hover:border-accent"
              >
                {category.name}
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="دسته‌ای برای نمایش وجود ندارد." />
        )}
      </Section>

      <Section title="برندها" href="/shop">
        {data.brands.length ? (
          <div className="flex flex-wrap gap-3">
            {data.brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.slug}`}
                className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent"
              >
                {brand.name}
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="برندی برای نمایش وجود ندارد." />
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link href={href} className="text-sm text-accent hover:underline">
          مشاهده همه
        </Link>
      </div>
      {children}
    </section>
  );
}

function ProductGrid({
  products,
  empty,
}: {
  products: Array<{
    id: string;
    name: string;
    slug: string;
    priceToman: number;
    compareAtPriceToman: number | null;
    primaryImageUrl: string | null;
    primaryImageAlt?: string | null;
    inStock: boolean;
    brandName?: string | null;
  }>;
  empty: string;
}) {
  if (!products.length) return <Empty text={empty} />;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-[var(--radius-lg)] border border-dashed border-border px-4 py-8 text-sm text-muted">{text}</p>;
}
