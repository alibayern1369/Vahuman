import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductPurchasePanel } from "@/features/storefront/product-purchase-panel";
import { appConfig } from "@/config/app";
import { getPublishedProductBySlug } from "@/lib/storefront/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getPublishedProductBySlug(slug);
  if (!detail) {
    return { title: "محصول یافت نشد" };
  }
  const title = detail.product.seoTitle || detail.product.name;
  const description =
    detail.product.seoDescription ||
    detail.product.shortDescription ||
    detail.product.description ||
    undefined;
  const image = detail.media.find((m) => m.isPrimary)?.url ?? detail.media[0]?.url;
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/product/${detail.product.slug}`;

  return {
    title: `${title} | ${appConfig.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: description || undefined,
      url,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getPublishedProductBySlug(slug);
  if (!detail) notFound();

  const { product, media, specifications, categories, variants } = detail;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description || undefined,
    sku: product.sku || undefined,
    brand: product.brandName
      ? { "@type": "Brand", name: product.brandName }
      : undefined,
    image: media.map((m) => m.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: product.priceToman,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          {media[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media[0].url}
              alt={media[0].alt || product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              بدون تصویر
            </div>
          )}
        </div>
        {media.length > 1 ? (
          <div className="grid grid-cols-4 gap-2">
            {media.slice(0, 8).map((item) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.id}
                src={item.url}
                alt={item.alt || product.name}
                className="aspect-square rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-6">
        {product.brandName && product.brandSlug ? (
          <Link href={`/brand/${product.brandSlug}`} className="text-sm text-accent hover:underline">
            {product.brandName}
          </Link>
        ) : null}
        <h1 className="text-3xl font-bold leading-tight">{product.name}</h1>
        {product.shortDescription ? (
          <p className="text-muted leading-7">{product.shortDescription}</p>
        ) : null}

        <ProductPurchasePanel
          productId={product.id}
          basePriceToman={product.priceToman}
          baseCompareAt={product.compareAtPriceToman}
          baseSku={product.sku}
          baseInStock={product.inStock}
          variants={variants}
        />

        {categories.length ? (
          <div className="flex flex-wrap gap-2 text-sm">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="rounded-full border border-border px-3 py-1 hover:border-accent"
              >
                {category.name}
              </Link>
            ))}
          </div>
        ) : null}

        {product.description ? (
          <div>
            <h2 className="mb-2 text-lg font-semibold">توضیحات</h2>
            <p className="whitespace-pre-wrap leading-8 text-muted">
              {product.description}
            </p>
          </div>
        ) : null}

        {specifications.length ? (
          <div>
            <h2 className="mb-3 text-lg font-semibold">مشخصات</h2>
            <dl className="divide-y divide-border rounded-[var(--radius-lg)] border border-border">
              {specifications.map((spec) => (
                <div
                  key={spec.id}
                  className="grid grid-cols-2 gap-3 px-4 py-3 text-sm"
                >
                  <dt className="text-muted">{spec.label}</dt>
                  <dd className="font-medium">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>
    </div>
  );
}
