import Link from "next/link";
import type { Metadata } from "next";

import { AccountSignOutButton } from "@/features/account/sign-out-button";
import { appConfig } from "@/config/app";
import { requireCustomerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `حساب کاربری | ${appConfig.name}`,
  robots: { index: false, follow: false },
};

export default async function AccountHomePage() {
  const session = await requireCustomerSession({ nextPath: "/account" });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">حساب کاربری</h1>
          <p className="mt-1 text-muted">{session.user.email}</p>
          <p className="text-sm text-muted">{session.user.name}</p>
        </div>
        <AccountSignOutButton />
      </div>

      <nav className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-5 hover:border-accent"
        >
          <span className="font-semibold">سفارش‌های من</span>
          <p className="mt-1 text-sm text-muted">پیگیری وضعیت و پرداخت</p>
        </Link>
        <Link
          href="/shop"
          className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-5 hover:border-accent"
        >
          <span className="font-semibold">ادامه خرید</span>
          <p className="mt-1 text-sm text-muted">بازگشت به فروشگاه</p>
        </Link>
      </nav>
    </div>
  );
}
