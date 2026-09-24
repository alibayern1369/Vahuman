import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { appConfig } from "@/config/app";
import { requireCustomerSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import {
  ORDER_STATUS_LABELS_FA,
  PAYMENT_STATUS_LABELS_FA,
} from "@/lib/orders/states";
import { formatDateTime, formatToman } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `سفارش‌های من | ${appConfig.name}`,
  robots: { index: false, follow: false },
};

export default async function AccountOrdersPage() {
  const session = await requireCustomerSession({ nextPath: "/account/orders" });
  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 space-y-6">
      <div>
        <Link href="/account" className="text-sm text-muted hover:text-accent">
          ← حساب کاربری
        </Link>
        <h1 className="mt-2 text-3xl font-bold">سفارش‌های من</h1>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border px-4 py-10 text-center">
          <p className="text-muted">هنوز سفارشی به این حساب متصل نیست.</p>
          <Link href="/shop" className="mt-4 inline-block text-accent hover:underline">
            رفتن به فروشگاه
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/account/orders/${row.reference}`}
                className="block rounded-[var(--radius-lg)] border border-border bg-surface p-4 hover:border-accent"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-medium" dir="ltr">
                    {row.reference}
                  </span>
                  <span className="text-sm">{formatToman(row.totalToman)}</span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {ORDER_STATUS_LABELS_FA[row.orderStatus]} ·{" "}
                  {PAYMENT_STATUS_LABELS_FA[row.paymentStatus]} ·{" "}
                  {formatDateTime(row.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
