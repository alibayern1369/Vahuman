import Link from "next/link";

import { appConfig } from "@/config/app";
import { getResolvedCart } from "@/lib/cart/cart";

export async function StorefrontHeader() {
  const cart = await getResolvedCart();

  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="min-w-0">
          <span className="block text-lg font-bold tracking-tight">{appConfig.name}</span>
          <span className="block text-[0.65rem] tracking-[0.2em] text-muted">
            {appConfig.nameLatin}
          </span>
        </Link>
        <nav aria-label="منوی اصلی" className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/shop" className="hover:text-accent">
            فروشگاه
          </Link>
          <Link href="/search" className="hover:text-accent">
            جستجو
          </Link>
          <Link href="/cart" className="rounded-[var(--radius-lg)] border border-border px-3 py-1.5 hover:bg-background">
            سبد
            {cart.itemCount > 0 ? (
              <span className="ms-2 inline-flex min-w-5 justify-center rounded-full bg-accent px-1.5 text-xs text-accent-foreground">
                {cart.itemCount.toLocaleString("fa-IR")}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function StorefrontFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:px-6">
        <p>{appConfig.name} · {appConfig.nameLatin}</p>
        <p>فروشگاه اینترنتی — فاز ۳: تجربه خرید عمومی</p>
      </div>
    </footer>
  );
}
