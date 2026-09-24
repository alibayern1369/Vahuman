import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { appConfig } from "@/config/app";
import { requireCustomerSession } from "@/lib/auth/session";
import { getOrderItems, getOrderByReference } from "@/lib/orders/checkout";
import {
  ORDER_STATUS_LABELS_FA,
  PAYMENT_STATUS_LABELS_FA,
} from "@/lib/orders/states";
import { formatDateTime, formatToman } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `سفارش ${reference} | ${appConfig.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function AccountOrderDetailPage({ params }: Props) {
  const session = await requireCustomerSession({
    nextPath: "/account/orders",
  });
  const { reference } = await params;
  const order = await getOrderByReference(reference);
  if (!order) notFound();

  // Ownership only — no guest token bypass on account URLs.
  if (order.userId !== session.user.id) {
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      redirect("/account/orders");
    }
  }

  const items = await getOrderItems(order.id);
  const showPayment =
    order.orderStatus === "pending_payment" ||
    order.orderStatus === "awaiting_payment_verification" ||
    order.orderStatus === "payment_rejected";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 space-y-6">
      <div>
        <Link
          href="/account/orders"
          className="text-sm text-muted hover:text-accent"
        >
          ← سفارش‌های من
        </Link>
        <h1 className="mt-2 text-2xl font-bold" dir="ltr">
          {order.reference}
        </h1>
      </div>

      <dl className="grid gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">وضعیت سفارش</dt>
          <dd className="font-medium">
            {ORDER_STATUS_LABELS_FA[order.orderStatus]}
          </dd>
        </div>
        <div>
          <dt className="text-muted">وضعیت پرداخت</dt>
          <dd className="font-medium">
            {PAYMENT_STATUS_LABELS_FA[order.paymentStatus]}
          </dd>
        </div>
        <div>
          <dt className="text-muted">مبلغ</dt>
          <dd className="font-medium">{formatToman(order.totalToman)}</dd>
        </div>
        <div>
          <dt className="text-muted">تاریخ</dt>
          <dd>{formatDateTime(order.createdAt)}</dd>
        </div>
        {order.trackingCode ? (
          <div className="sm:col-span-2">
            <dt className="text-muted">کد پیگیری ارسال</dt>
            <dd className="font-mono" dir="ltr">
              {order.trackingCode}
            </dd>
          </div>
        ) : null}
      </dl>

      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4">
            <span>
              {item.productNameSnapshot}
              {item.variantTitleSnapshot
                ? ` — ${item.variantTitleSnapshot}`
                : ""}{" "}
              × {item.quantity.toLocaleString("fa-IR")}
            </span>
            <span>{formatToman(item.lineTotalToman)}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        {showPayment ? (
          <Link
            href={`/order/${order.reference}/payment`}
            className="rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm text-accent-foreground"
          >
            پرداخت / ارسال رسید
          </Link>
        ) : null}
        <Link
          href={`/order/${order.reference}`}
          className="rounded-[var(--radius-lg)] border border-border px-4 py-2 text-sm"
        >
          صفحه عمومی سفارش
        </Link>
      </div>
    </div>
  );
}
