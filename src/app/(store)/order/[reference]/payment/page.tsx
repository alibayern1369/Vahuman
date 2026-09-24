import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { ReceiptUploadForm } from "@/features/checkout/receipt-upload-form";
import { appConfig } from "@/config/app";
import { getDb } from "@/lib/db";
import { paymentReceipts } from "@/lib/db/schema";
import { requireOrderAccess } from "@/lib/orders/authorize";
import { getOrderItems } from "@/lib/orders/checkout";
import {
  formatCardNumberDisplay,
  getPublicPaymentInstructions,
} from "@/lib/orders/settings";
import {
  canSubmitReceipt,
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
    title: `پرداخت سفارش ${reference} | ${appConfig.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function OrderPaymentPage({ params, searchParams }: Props) {
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
          برای مشاهده این سفارش به لینک امن ارسال‌شده پس از ثبت نیاز دارید.
        </p>
        <Link href="/" className="mt-6 inline-block text-accent hover:underline">
          بازگشت به فروشگاه
        </Link>
      </div>
    );
  }

  const payment = await getPublicPaymentInstructions();
  const items = await getOrderItems(order.id);
  const canSubmit = canSubmitReceipt({
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    reservationExpiresAt: order.reservationExpiresAt,
  });

  const db = getDb();
  const [activeReceipt] = await db
    .select()
    .from(paymentReceipts)
    .where(eq(paymentReceipts.orderId, order.id))
    .orderBy(desc(paymentReceipts.submittedAt))
    .limit(1);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 space-y-8">
      <div>
        <p className="text-sm text-muted">شماره سفارش</p>
        <h1 className="text-2xl font-bold tracking-tight" dir="ltr">
          {order.reference}
        </h1>
        <p className="mt-2 text-sm">
          وضعیت: {ORDER_STATUS_LABELS_FA[order.orderStatus]} · پرداخت:{" "}
          {PAYMENT_STATUS_LABELS_FA[order.paymentStatus]}
        </p>
      </div>

      <div className="rounded-[var(--radius-lg)] border-2 border-accent bg-surface p-6 text-center">
        <p className="text-sm text-muted">مبلغ دقیق قابل پرداخت</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {formatToman(order.totalToman)}
        </p>
        <p className="mt-2 text-xs text-muted">
          فقط همین مبلغ را واریز کنید. تغییر مبلغ از مرورگر ممکن نیست.
        </p>
      </div>

      {(order.orderStatus === "pending_payment" ||
        order.orderStatus === "awaiting_payment_verification" ||
        order.orderStatus === "payment_rejected") && (
        <section className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">پرداخت کارت‌به‌کارت</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">شماره کارت</dt>
              <dd className="font-mono tracking-wider" dir="ltr">
                {formatCardNumberDisplay(payment.cardNumber)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">نام دارنده کارت</dt>
              <dd>{payment.cardholderName}</dd>
            </div>
            {payment.bankName ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">بانک</dt>
                <dd>{payment.bankName}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">مهلت پرداخت / رزرو موجودی</dt>
              <dd>{formatDateTime(order.reservationExpiresAt)}</dd>
            </div>
          </dl>
          {payment.instructions ? (
            <p className="text-sm leading-7 text-muted">{payment.instructions}</p>
          ) : null}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">اقلام سفارش</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-4 border-b border-border pb-2"
            >
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

      {order.paymentStatus === "rejected" && order.paymentRejectionReason ? (
        <p className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          دلیل رد: {order.paymentRejectionReason}
        </p>
      ) : null}

      {activeReceipt?.isActive ? (
        <p className="text-sm text-muted">
          آخرین رسید در {formatDateTime(activeReceipt.submittedAt)} ثبت شد
          {activeReceipt.transactionReference
            ? ` · پیگیری: ${activeReceipt.transactionReference}`
            : ""}
          .
        </p>
      ) : null}

      <section className="space-y-3 rounded-[var(--radius-lg)] border border-border p-5">
        <h2 className="text-lg font-semibold">ارسال رسید پرداخت</h2>
        <ReceiptUploadForm reference={order.reference} canSubmit={canSubmit} />
      </section>

      <Link
        href={`/order/${order.reference}`}
        className="inline-block text-sm text-accent hover:underline"
      >
        مشاهده وضعیت سفارش
      </Link>
    </div>
  );
}
