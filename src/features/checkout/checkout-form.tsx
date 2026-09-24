"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  placeOrderAction,
  type ActionResult,
} from "@/features/checkout/actions";
import { formatToman } from "@/lib/utils/format";

type Props = {
  idempotencyKey: string;
  subtotalToman: number;
  shippingToman: number;
  totalToman: number;
  lineCount: number;
};

const initial: ActionResult | null = null;

export function CheckoutForm({
  idempotencyKey,
  subtotalToman,
  shippingToman,
  totalToman,
  lineCount,
}: Props) {
  const [state, formAction, pending] = useActionState(placeOrderAction, initial);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">اطلاعات گیرنده</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>نام و نام خانوادگی</span>
            <input
              name="fullName"
              required
              maxLength={120}
              className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2"
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>موبایل</span>
            <input
              name="mobile"
              required
              inputMode="numeric"
              pattern="09[0-9]{9}"
              placeholder="09123456789"
              className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2"
              autoComplete="tel"
              dir="ltr"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>استان</span>
            <input
              name="province"
              required
              maxLength={80}
              className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>شهر</span>
            <input
              name="city"
              required
              maxLength={80}
              className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>آدرس تحویل</span>
            <textarea
              name="address"
              required
              rows={3}
              maxLength={500}
              className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>کد پستی</span>
            <input
              name="postalCode"
              required
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2"
              dir="ltr"
            />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>یادداشت سفارش (اختیاری)</span>
            <textarea
              name="customerNote"
              rows={2}
              maxLength={1000}
              className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2"
            />
          </label>
        </div>
      </fieldset>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 space-y-2">
        <p className="text-sm text-muted">{lineCount.toLocaleString("fa-IR")} قلم در سبد</p>
        <div className="flex justify-between text-sm">
          <span>جمع جزء</span>
          <span>{formatToman(subtotalToman)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>هزینه ارسال</span>
          <span>{formatToman(shippingToman)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
          <span>مبلغ قابل پرداخت</span>
          <span>{formatToman(totalToman)}</span>
        </div>
        <p className="text-xs text-muted">
          مبالغ فقط از سمت سرور محاسبه می‌شوند و در مرورگر قابل تغییر نیستند.
        </p>
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-lg)] bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "در حال ثبت…" : "ثبت سفارش و ادامه پرداخت"}
        </button>
        <Link href="/cart" className="text-sm text-muted hover:text-accent">
          بازگشت به سبد
        </Link>
      </div>
    </form>
  );
}
