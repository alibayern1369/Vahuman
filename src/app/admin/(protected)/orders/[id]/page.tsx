import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";

import { AdminOrderActions } from "@/features/orders/admin-order-actions";
import { appConfig } from "@/config/app";
import { requireAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  inventoryReservations,
  orderEvents,
  orderItems,
  orders,
  paymentReceipts,
} from "@/lib/db/schema";
import {
  ORDER_STATUS_LABELS_FA,
  PAYMENT_STATUS_LABELS_FA,
} from "@/lib/orders/states";
import { formatDateTime, formatToman } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `سفارش ${id.slice(0, 8)} | ${appConfig.adminTitle}` };
}

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;
  const db = getDb();

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  const reservations = await db
    .select()
    .from(inventoryReservations)
    .where(eq(inventoryReservations.orderId, order.id));
  const receipts = await db
    .select()
    .from(paymentReceipts)
    .where(eq(paymentReceipts.orderId, order.id))
    .orderBy(desc(paymentReceipts.submittedAt));
  const events = await db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, order.id))
    .orderBy(asc(orderEvents.createdAt));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-muted hover:text-accent">
            ← بازگشت
          </Link>
          <h2 className="mt-2 text-2xl font-bold" dir="ltr">
            {order.reference}
          </h2>
          <p className="text-sm text-muted">
            {ORDER_STATUS_LABELS_FA[order.orderStatus]} ·{" "}
            {PAYMENT_STATUS_LABELS_FA[order.paymentStatus]}
          </p>
        </div>
        <AdminOrderActions
          orderId={order.id}
          orderStatus={order.orderStatus}
          paymentStatus={order.paymentStatus}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-sm space-y-2">
          <h3 className="font-semibold">مشتری و آدرس</h3>
          <p>{order.customerFullName}</p>
          <p dir="ltr">{order.customerMobile}</p>
          <p>
            {order.shippingProvince}، {order.shippingCity}
          </p>
          <p>{order.shippingAddress}</p>
          <p dir="ltr">کد پستی: {order.shippingPostalCode}</p>
          {order.customerNote ? (
            <p className="text-muted">یادداشت مشتری: {order.customerNote}</p>
          ) : null}
          {order.adminNote ? (
            <p className="text-muted">یادداشت مدیر: {order.adminNote}</p>
          ) : null}
          {order.paymentRejectionReason ? (
            <p className="text-red-800">
              دلیل رد پرداخت: {order.paymentRejectionReason}
            </p>
          ) : null}
          {order.trackingCode ? (
            <p dir="ltr">پیگیری ارسال: {order.trackingCode}</p>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-sm space-y-2">
          <h3 className="font-semibold">مبالغ</h3>
          <p>جمع جزء: {formatToman(order.subtotalToman)}</p>
          <p>ارسال: {formatToman(order.shippingToman)}</p>
          <p>تخفیف: {formatToman(order.discountToman)}</p>
          <p className="text-lg font-bold">
            قابل پرداخت: {formatToman(order.totalToman)}
          </p>
          <p className="text-xs text-muted">
            مهلت رزرو: {formatDateTime(order.reservationExpiresAt)}
          </p>
          {order.paymentVerifiedAt ? (
            <p className="text-xs text-muted">
              تأیید پرداخت: {formatDateTime(order.paymentVerifiedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h3 className="mb-3 font-semibold">اقلام</h3>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {item.productNameSnapshot}
                {item.variantTitleSnapshot
                  ? ` — ${item.variantTitleSnapshot}`
                  : ""}
                {item.skuSnapshot ? ` · SKU ${item.skuSnapshot}` : ""} ×{" "}
                {item.quantity.toLocaleString("fa-IR")} @{" "}
                {formatToman(item.unitPriceToman)}
              </span>
              <span>{formatToman(item.lineTotalToman)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h3 className="mb-3 font-semibold">رزرو موجودی</h3>
        {reservations.length === 0 ? (
          <p className="text-sm text-muted">بدون رزرو (محصول بدون ردیابی موجودی)</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {reservations.map((r) => (
              <li key={r.id}>
                qty {r.quantity} · {r.status} · تا{" "}
                {formatDateTime(r.expiresAt)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h3 className="mb-3 font-semibold">رسیدها</h3>
        {receipts.length === 0 ? (
          <p className="text-sm text-muted">رسیدی ثبت نشده.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {receipts.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p>
                    {formatDateTime(r.submittedAt)}
                    {r.isActive ? " · فعال" : " · جایگزین‌شده"}
                  </p>
                  {r.transactionReference ? (
                    <p className="text-muted" dir="ltr">
                      پیگیری: {r.transactionReference}
                    </p>
                  ) : null}
                  {r.customerNote ? (
                    <p className="text-muted">{r.customerNote}</p>
                  ) : null}
                </div>
                <Link
                  href={`/admin/orders/${order.id}/receipt/${r.id}`}
                  className="text-accent hover:underline"
                >
                  مشاهده فایل
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h3 className="mb-3 font-semibold">تاریخچه رویدادها</h3>
        <ol className="space-y-2 text-sm">
          {events.map((e) => (
            <li key={e.id} className="border-b border-border pb-2">
              <span className="font-medium">{e.eventType}</span>
              <span className="text-muted">
                {" "}
                · {formatDateTime(e.createdAt)} · {e.actorType}
              </span>
              {(e.fromOrderStatus || e.toOrderStatus) && (
                <span className="block text-xs text-muted">
                  سفارش: {e.fromOrderStatus ?? "—"} → {e.toOrderStatus ?? "—"}
                </span>
              )}
              {(e.fromPaymentStatus || e.toPaymentStatus) && (
                <span className="block text-xs text-muted">
                  پرداخت: {e.fromPaymentStatus ?? "—"} →{" "}
                  {e.toPaymentStatus ?? "—"}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
