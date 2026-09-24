import Link from "next/link";

import { formatToman } from "@/lib/utils/format";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  priceToman: number;
  compareAtPriceToman: number | null;
  primaryImageUrl: string | null;
  primaryImageAlt?: string | null;
  inStock: boolean;
  brandName?: string | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const hasDiscount =
    product.compareAtPriceToman != null &&
    product.compareAtPriceToman > product.priceToman;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compareAtPriceToman! - product.priceToman) /
          product.compareAtPriceToman!) *
          100,
      )
    : 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      <Link href={`/product/${product.slug}`} className="block aspect-[4/5] overflow-hidden bg-background">
        {product.primaryImageUrl ? (
          // Remote media references are URL-only until object storage is configured.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primaryImageUrl}
            alt={product.primaryImageAlt || product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            بدون تصویر
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.brandName ? (
          <p className="text-xs text-muted">{product.brandName}</p>
        ) : null}
        <h3 className="text-base font-semibold leading-6">
          <Link href={`/product/${product.slug}`} className="hover:text-accent">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{formatToman(product.priceToman)}</span>
            {hasDiscount ? (
              <span className="text-sm text-muted line-through">
                {formatToman(product.compareAtPriceToman!)}
              </span>
            ) : null}
            {hasDiscount ? (
              <span className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">
                ٪{discountPercent.toLocaleString("fa-IR")}
              </span>
            ) : null}
          </div>
          <p className={`text-xs ${product.inStock ? "text-muted" : "text-red-700"}`}>
            {product.inStock ? "موجود" : "ناموجود"}
          </p>
        </div>
      </div>
    </article>
  );
}
