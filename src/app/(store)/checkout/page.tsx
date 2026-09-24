import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { CheckoutForm } from "@/features/checkout/checkout-form";
import { appConfig } from "@/config/app";
import { getResolvedCart } from "@/lib/cart/cart";
import { getShippingSettings } from "@/lib/orders/settings";
import { formatToman } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `تسویه حساب | ${appConfig.name}`,
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const cart = await getResolvedCart();
  if (!cart.lines.length) {
    redirect("/cart");
  }

  const shipping = await getShippingSettings();
  const totalToman = cart.subtotalToman + shipping.flatRateToman;
  const idempotencyKey = randomUUID();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold">تسویه حساب</h1>
      <p className="mb-8 text-muted">
        بدون نیاز به ساخت حساب کاربری می‌توانید سفارش را ثبت کنید.
      </p>

      <div className="mb-8 space-y-2 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h2 className="font-semibold">خلاصه سبد</h2>
        <ul className="space-y-1 text-sm">
          {cart.lines.map((line) => (
            <li key={line.itemId} className="flex justify-between gap-4">
              <span>
                {line.name}
                {line.variantId ? " (واریانت)" : ""} ×{" "}
                {line.quantity.toLocaleString("fa-IR")}
              </span>
              <span>{formatToman(line.lineTotalToman)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          قیمت‌ها هنگام ثبت سفارش دوباره از پایگاه‌داده خوانده می‌شوند.
        </p>
        <Link href="/cart" className="text-sm text-accent hover:underline">
          ویرایش سبد
        </Link>
      </div>

      <CheckoutForm
        idempotencyKey={idempotencyKey}
        subtotalToman={cart.subtotalToman}
        shippingToman={shipping.flatRateToman}
        totalToman={totalToman}
        lineCount={cart.lines.length}
      />
    </div>
  );
}
