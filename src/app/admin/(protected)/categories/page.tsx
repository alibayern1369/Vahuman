import Link from "next/link";

import { CategoryForm } from "@/features/catalog/components/category-form";
import { getAdminCategories } from "@/features/catalog/queries";
import { buildCategoryTree } from "@/lib/catalog/category-tree";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  const tree = buildCategoryTree(categories);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">دسته‌ها</h2>
          <p className="mt-2 text-muted">مدیریت سلسله‌مراتبی دسته‌بندی محصولات</p>
        </div>
        <Link href="/admin/categories/new" className="rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm text-accent-foreground">
          دسته جدید
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-2">
          {tree.length === 0 ? (
            <p className="text-muted">دسته‌ای وجود ندارد.</p>
          ) : (
            <CategoryTreeList nodes={tree} depth={0} />
          )}
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border p-4">
          <h3 className="mb-3 font-semibold">ایجاد سریع</h3>
          <CategoryForm mode="create" categories={categories} />
        </div>
      </div>
    </section>
  );
}

function CategoryTreeList({
  nodes,
  depth,
}: {
  nodes: ReturnType<typeof buildCategoryTree>;
  depth: number;
}) {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            className="rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2"
            style={{ marginInlineStart: depth * 16 }}
          >
            <Link href={`/admin/categories/${node.id}`} className="font-medium text-accent hover:underline">
              {node.name}
            </Link>
            <span className="ms-2 text-xs text-muted">
              {node.status === "active" ? "فعال" : "غیرفعال"} · {node.slug}
            </span>
          </div>
          {node.children.length ? (
            <CategoryTreeList nodes={node.children} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
