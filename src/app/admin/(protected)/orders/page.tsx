import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";

import { appConfig } from "@/config/app";
import { requireAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import {
  ORDER_STATUS_LABELS_FA,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS_FA,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders/states";
import { formatDateTime, formatToman } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `سفارش‌ها | ${appConfig.adminTitle}`,
};

type SearchParams = Promise<{
  q?: string;
  mobile?: string;
  orderStatus?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
}>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminSession();
  const sp = await searchParams;
  const db = getDb();

  const filters = [];
  if (sp.q?.trim()) {
    filters.push(ilike(orders.reference, `%${sp.q.trim()}%`));
  }
  if (sp.mobile?.trim()) {
    filters.push(ilike(orders.customerMobile, `%${sp.mobile.trim()}%`));
  }
  if (
    sp.orderStatus &&
    ORDER_STATUSES.includes(sp.orderStatus as OrderStatus)
  ) {
    filters.push(eq(orders.orderStatus, sp.orderStatus as OrderStatus));
  }
  if (
    sp.paymentStatus &&
    PAYMENT_STATUSES.includes(sp.paymentStatus as PaymentStatus)
  ) {
    filters.push(eq(orders.paymentStatus, sp.paymentStatus as PaymentStatus));
  }
  if (sp.from) {
    const d = new Date(sp.from);
    if (!Number.isNaN(d.getTime())) filters.push(gte(orders.createdAt, d));
  }
  if (sp.to) {
    const d = new Date(sp.to);
    if (!Number.isNaN(d.getTime())) filters.push(lte(orders.createdAt, d));
  }

  const rows = await db
    .select()
    .from(orders)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">سفارش‌ها</h2>
        <p className="mt-1 text-muted">مدیریت پرداخت کارت‌به‌کارت و ارسال</p>
      </div>

      <form className="grid gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:grid-cols-3">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="شماره سفارش"
          className="rounded-[var(--radius-lg)] border border-border px-3 py-2 text-sm"
          dir="ltr"
        />
        <input
          name="mobile"
          defaultValue={sp.mobile ?? ""}
          placeholder="موبایل"
          className="rounded-[var(--radius-lg)] border border-border px-3 py-2 text-sm"
          dir="ltr"
        />
        <select
          name="orderStatus"
          defaultValue={sp.orderStatus ?? ""}
          className="rounded-[var(--radius-lg)] border border-border px-3 py-2 text-sm"
        >
          <option value="">همه وضعیت‌های سفارش</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS_FA[s]}
            </option>
          ))}
        </select>
        <select
          name="paymentStatus"
          defaultValue={sp.paymentStatus ?? ""}
          className="rounded-[var(--radius-lg)] border border-border px-3 py-2 text-sm"
        >
          <option value="">همه وضعیت‌های پرداخت</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABELS_FA[s]}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={sp.from ?? ""}
          className="rounded-[var(--radius-lg)] border border-border px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={sp.to ?? ""}
          className="rounded-[var(--radius-lg)] border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-[var(--radius-lg)] bg-accent px-3 py-2 text-sm text-accent-foreground sm:col-span-3"
        >
          فیلتر
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted">
              <th className="px-2 py-2 font-medium">مرجع</th>
              <th className="px-2 py-2 font-medium">مشتری</th>
              <th className="px-2 py-2 font-medium">مبلغ</th>
              <th className="px-2 py-2 font-medium">سفارش</th>
              <th className="px-2 py-2 font-medium">پرداخت</th>
              <th className="px-2 py-2 font-medium">تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border">
                <td className="px-2 py-3">
                  <Link
                    href={`/admin/orders/${row.id}`}
                    className="font-mono text-accent hover:underline"
                    dir="ltr"
                  >
                    {row.reference}
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <div>{row.customerFullName}</div>
                  <div className="text-xs text-muted" dir="ltr">
                    {row.customerMobile}
                  </div>
                </td>
                <td className="px-2 py-3">{formatToman(row.totalToman)}</td>
                <td className="px-2 py-3">
                  {ORDER_STATUS_LABELS_FA[row.orderStatus]}
                </td>
                <td className="px-2 py-3">
                  {PAYMENT_STATUS_LABELS_FA[row.paymentStatus]}
                </td>
                <td className="px-2 py-3 text-xs">
                  {formatDateTime(row.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-muted">سفارشی یافت نشد.</p>
        ) : null}
      </div>
    </section>
  );
}
