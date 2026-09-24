import { getDb } from "@/lib/db";
import { storeSettings } from "@/lib/db/schema";

export default async function AdminSettingsPage() {
  const db = getDb();
  const rows = await db.select().from(storeSettings);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">تنظیمات</h2>
        <p className="mt-2 text-muted">
          تنظیمات پایه فروشگاه (فقط مشاهده در فاز ۱).
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted">
          هنوز تنظیمی ثبت نشده. پس از{" "}
          <code className="rounded bg-surface px-1">pnpm db:seed-admin</code>{" "}
          مقادیر پیش‌فرض اضافه می‌شوند.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3"
            >
              <p className="text-sm text-muted">{row.key}</p>
              <p className="mt-1 font-medium">{row.value}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
