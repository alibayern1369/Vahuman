"use client";

import { useState, useTransition } from "react";

import {
  approvePaymentAction,
  cancelOrderAction,
  fulfillOrderAction,
  rejectPaymentAction,
} from "@/features/orders/admin-actions";

type Props = {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
};

export function AdminOrderActions({
  orderId,
  orderStatus,
  paymentStatus,
}: Props) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [tracking, setTracking] = useState("");

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setMessage(null);
    setError(null);
    start(async () => {
      const result = await fn();
      if (result.ok) setMessage(result.message ?? "انجام شد.");
      else setError(result.error ?? "خطا");
    });
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <h3 className="font-semibold">اقدامات</h3>

      {paymentStatus === "receipt_submitted" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className="rounded-[var(--radius-lg)] bg-accent px-3 py-1.5 text-sm text-accent-foreground disabled:opacity-60"
            onClick={() => run(() => approvePaymentAction(orderId))}
          >
            تأیید پرداخت
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="دلیل رد"
              className="rounded-[var(--radius-lg)] border border-border px-2 py-1 text-sm"
            />
            <button
              type="button"
              disabled={pending}
              className="rounded-[var(--radius-lg)] border border-border px-3 py-1.5 text-sm disabled:opacity-60"
              onClick={() =>
                run(() => rejectPaymentAction(orderId, rejectReason))
              }
            >
              رد پرداخت
            </button>
          </div>
        </div>
      ) : null}

      {paymentStatus === "verified" ? (
        <div className="space-y-2">
          {orderStatus === "paid" ? (
            <button
              type="button"
              disabled={pending}
              className="rounded-[var(--radius-lg)] border border-border px-3 py-1.5 text-sm"
              onClick={() =>
                run(() => fulfillOrderAction(orderId, "processing"))
              }
            >
              شروع آماده‌سازی
            </button>
          ) : null}
          {orderStatus === "processing" ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="کد پیگیری ارسال (اختیاری)"
                className="rounded-[var(--radius-lg)] border border-border px-2 py-1 text-sm"
                dir="ltr"
              />
              <button
                type="button"
                disabled={pending}
                className="rounded-[var(--radius-lg)] border border-border px-3 py-1.5 text-sm"
                onClick={() =>
                  run(() => fulfillOrderAction(orderId, "shipped", tracking))
                }
              >
                علامت ارسال‌شده
              </button>
            </div>
          ) : null}
          {orderStatus === "shipped" ? (
            <button
              type="button"
              disabled={pending}
              className="rounded-[var(--radius-lg)] border border-border px-3 py-1.5 text-sm"
              onClick={() =>
                run(() => fulfillOrderAction(orderId, "delivered"))
              }
            >
              علامت تحویل‌شده
            </button>
          ) : null}
        </div>
      ) : null}

      {orderStatus !== "cancelled" &&
      orderStatus !== "delivered" &&
      orderStatus !== "expired" ? (
        <button
          type="button"
          disabled={pending}
          className="rounded-[var(--radius-lg)] border border-red-300 px-3 py-1.5 text-sm text-red-800"
          onClick={() => run(() => cancelOrderAction(orderId, "لغو توسط مدیر"))}
        >
          لغو سفارش
        </button>
      ) : null}

      {message ? <p className="text-sm text-green-800">{message}</p> : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
