import { requireAdminSession } from "@/lib/auth/session";
import {
  formatCardNumberDisplay,
  getCardToCardSettings,
  getShippingSettings,
} from "@/lib/orders/settings";
import { getStorageStatus } from "@/lib/storage/private-storage";
import { savePaymentSettingsAction } from "@/features/orders/admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminSession();
  const payment = await getCardToCardSettings();
  const shipping = await getShippingSettings();
  const storage = getStorageStatus();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">تنظیمات</h2>
        <p className="mt-2 text-muted">
          پرداخت کارت‌به‌کارت، مهلت رزرو و هزینه ارسال.
        </p>
      </div>

      <form action={savePaymentSettingsAction} className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <h3 className="font-semibold">کارت‌به‌کارت</h3>
        <label className="block space-y-1 text-sm">
          <span>شماره کارت (۱۶ رقم)</span>
          <input
            name="cardNumber"
            defaultValue={payment.cardNumber}
            required
            maxLength={19}
            className="w-full rounded-[var(--radius-lg)] border border-border px-3 py-2 font-mono"
            dir="ltr"
          />
          <span className="text-xs text-muted">
            نمایش فعلی: {formatCardNumberDisplay(payment.cardNumber)}
          </span>
        </label>
        <label className="block space-y-1 text-sm">
          <span>نام دارنده کارت</span>
          <input
            name="cardholderName"
            defaultValue={payment.cardholderName}
            required
            className="w-full rounded-[var(--radius-lg)] border border-border px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>نام بانک (اختیاری)</span>
          <input
            name="bankName"
            defaultValue={payment.bankName ?? ""}
            className="w-full rounded-[var(--radius-lg)] border border-border px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>دستورالعمل پرداخت</span>
          <textarea
            name="instructions"
            rows={4}
            defaultValue={payment.instructions ?? ""}
            className="w-full rounded-[var(--radius-lg)] border border-border px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>مهلت رزرو / پرداخت (دقیقه)</span>
          <input
            type="number"
            name="reservationMinutes"
            min={15}
            max={10080}
            defaultValue={payment.reservationMinutes}
            className="w-full rounded-[var(--radius-lg)] border border-border px-3 py-2"
            dir="ltr"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>هزینه ارسال ثابت (تومان)</span>
          <input
            type="number"
            name="shippingFlatRateToman"
            min={0}
            defaultValue={shipping.flatRateToman}
            className="w-full rounded-[var(--radius-lg)] border border-border px-3 py-2"
            dir="ltr"
          />
        </label>
        <button
          type="submit"
          className="rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm text-accent-foreground"
        >
          ذخیره تنظیمات
        </button>
      </form>

      <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-4 text-sm text-muted">
        <p className="font-medium text-foreground">ذخیره‌سازی رسید</p>
        <p className="mt-1">
          ارائه‌دهنده: {storage.provider} ·{" "}
          {storage.ready ? "آماده (توسعه)" : "مسدود"}
        </p>
        <p className="mt-1">{storage.note}</p>
      </div>
    </section>
  );
}
