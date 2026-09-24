import { count } from "drizzle-orm";

import { appConfig } from "@/config/app";
import { getDb } from "@/lib/db";
import { categories, products, user } from "@/lib/db/schema";

export default async function AdminDashboardPage() {
  const db = getDb();

  const [productCount] = await db.select({ value: count() }).from(products);
  const [categoryCount] = await db.select({ value: count() }).from(categories);
  const [userCount] = await db.select({ value: count() }).from(user);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">داشبورد</h2>
        <p className="mt-2 text-muted">
          اسکلت {appConfig.adminTitle} — فاز ۱. مدیریت کامل فروشگاه در فازهای
          بعدی اضافه می‌شود.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="محصولات" value={productCount?.value ?? 0} />
        <StatCard label="دسته‌ها" value={categoryCount?.value ?? 0} />
        <StatCard label="کاربران" value={userCount?.value ?? 0} />
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">
        {value.toLocaleString("fa-IR")}
      </p>
    </div>
  );
}
