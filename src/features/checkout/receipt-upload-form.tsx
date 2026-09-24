"use client";

import { useActionState } from "react";

import {
  submitReceiptAction,
  type ActionResult,
} from "@/features/checkout/actions";

type Props = {
  reference: string;
  canSubmit: boolean;
};

export function ReceiptUploadForm({ reference, canSubmit }: Props) {
  const action = submitReceiptAction.bind(null, reference);
  const [state, formAction, pending] = useActionState(
    action,
    null as ActionResult | null,
  );

  if (!canSubmit) {
    return (
      <p className="text-sm text-muted">
        در وضعیت فعلی امکان ارسال رسید وجود ندارد.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
      <label className="block space-y-1 text-sm">
        <span>تصویر یا PDF رسید</span>
        <input
          type="file"
          name="receipt"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          className="block w-full text-sm"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>شماره پیگیری بانکی (اختیاری)</span>
        <input
          name="transactionReference"
          maxLength={120}
          className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2"
          dir="ltr"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>توضیح کوتاه (اختیاری)</span>
        <textarea
          name="customerNote"
          rows={2}
          maxLength={500}
          className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2"
        />
      </label>
      <p className="text-xs text-muted">
        ارسال رسید به‌معنای تأیید پرداخت نیست. مبلغ واریزی پس از بررسی دستی تأیید می‌شود.
      </p>
      {state?.ok ? (
        <p className="text-sm text-green-800">{state.message}</p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "در حال ارسال…" : "ارسال رسید"}
      </button>
    </form>
  );
}
