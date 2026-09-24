import Link from "next/link";
import type { Metadata } from "next";

import { CartLineControls } from "@/features/cart/cart-line-controls";
import { appConfig } from "@/config/app";
import { getResolvedCart } from "@/lib/cart/cart";
import { formatToman } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `سبد خرید | ${appConfig.name}`,
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const cart = await getResolvedCart();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">سبد خرید</h1>
      {cart.lines.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border px-4 py-10 text-center">
          <p className="text-muted">سبد خرید شما خالی است.</p>
          <Link href="/shop" className="mt-4 inline-block text-accent hover:underline">
            رفتن به فروشگاه
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {cart.lines.map((line) => (
              <li
                key={line.itemId}
                className="rounded-[var(--radius-lg)] border border-border bg-surface p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link
                      href={`/product/${line.slug}`}
                      className="font-medium hover:text-accent"
                    >
                      {line.name}
                    </Link>
                    {line.sku ? (
                      <p className="text-xs text-muted">SKU: {line.sku}</p>
                    ) : null}
                    <p className="mt-1 text-sm">{formatToman(line.unitPriceToman)}</p>
                  </div>
                  <CartLineControls
                    itemId={line.itemId}
                    quantity={line.quantity}
                    lineTotalToman={line.lineTotalToman}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-muted">جمع جزء</span>
            <span className="text-xl font-bold">
              {formatToman(cart.subtotalToman)}
            </span>
          </div>
          <p className="text-sm text-muted">
            پرداخت و ثبت سفارش در فاز بعدی اضافه می‌شود.
          </p>
        </div>
      )}
    </div>
  );
}
