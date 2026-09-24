import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { appConfig } from "@/config/app";
import { getOrderItems } from "@/lib/orders/checkout";
import { requireOrderAccess } from "@/lib/orders/authorize";
import {
  ORDER_STATUS_LABELS_FA,
  PAYMENT_STATUS_LABELS_FA,
} from "@/lib/orders/states";
import { formatDateTime, formatToman } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ access?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `سفارش ${reference} | ${appConfig.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function OrderStatusPage({ params, searchParams }: Props) {
  const { reference } = await params;
  const { access } = await searchParams;

  let order;
  try {
    order = await requireOrderAccess(reference, {
      accessTokenFromQuery: access,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "NOT_FOUND") notFound();
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">دسترسی مجاز نیست</h1>
        <p className="mt-2 text-muted">
          شماره سفارش به‌تنهایی برای مشاهده کافی نیست.
        </p>
      </div>
    );
  }

  const items = await getOrderItems(order.id);
  const showPaymentCta =
    order.orderStatus === "pending_payment" ||
    order.orderStatus === "awaiting_payment_verification" ||
    order.orderStatus === "payment_rejected";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 space-y-6">
      <div>
        <p className="text-sm text-muted">سفارش</p>
        <h1 className="text-2xl font-bold" dir="ltr">
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
          <dt className="text-muted">مبلغ کل</dt>
          <dd className="font-medium">{formatToman(order.totalToman)}</dd>
        </div>
        <div>
          <dt className="text-muted">تاریخ ثبت</dt>
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

      <section>
        <h2 className="mb-3 font-semibold">اقلام</h2>
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
      </section>

      {showPaymentCta ? (
        <Link
          href={`/order/${order.reference}/payment`}
          className="inline-flex rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm text-accent-foreground"
        >
          مشاهده دستور پرداخت / ارسال رسید
        </Link>
      ) : null}
    </div>
  );
}
