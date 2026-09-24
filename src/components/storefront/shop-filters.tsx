import Link from "next/link";

type ShopFiltersProps = {
  q?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  categorySlug?: string;
  brandSlug?: string;
  action?: string;
};

export function ShopFiltersForm({
  q,
  sort,
  minPrice,
  maxPrice,
  inStock,
  categorySlug,
  brandSlug,
  action = "/shop",
}: ShopFiltersProps) {
  return (
    <form action={action} className="grid gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 md:grid-cols-6">
      {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
      {brandSlug ? <input type="hidden" name="brand" value={brandSlug} /> : null}
      <input
        name="q"
        defaultValue={q ?? ""}
        placeholder="جستجو..."
        className="rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm md:col-span-2"
      />
      <select
        name="sort"
        defaultValue={sort ?? "newest"}
        className="rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="newest">جدیدترین</option>
        <option value="price_asc">ارزان‌ترین</option>
        <option value="price_desc">گران‌ترین</option>
      </select>
      <input
        name="minPrice"
        type="number"
        defaultValue={minPrice ?? ""}
        placeholder="حداقل قیمت"
        className="rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        name="maxPrice"
        type="number"
        defaultValue={maxPrice ?? ""}
        placeholder="حداکثر قیمت"
        className="rounded-[var(--radius-lg)] border border-border bg-background px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="inStock" value="1" defaultChecked={inStock === "1"} />
        فقط موجود
      </label>
      <div className="flex gap-2 md:col-span-6">
        <button type="submit" className="rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm text-accent-foreground">
          اعمال
        </button>
        <Link href={action} className="rounded-[var(--radius-lg)] border border-border px-4 py-2 text-sm">
          پاک کردن
        </Link>
      </div>
    </form>
  );
}
