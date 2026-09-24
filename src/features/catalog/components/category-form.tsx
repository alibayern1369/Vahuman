"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/catalog/actions";
import {
  ActionForm,
  Field,
  buttonClassName,
  inputClassName,
  secondaryButtonClassName,
} from "@/features/catalog/components/form-ui";

type Option = { id: string; name: string; parentId: string | null };

type CategoryFormProps = {
  mode: "create" | "edit";
  categories: Option[];
  initial?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    status: "active" | "inactive";
    sortOrder: number;
  };
};

export function CategoryForm({ mode, categories, initial }: CategoryFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [parentId, setParentId] = useState(initial?.parentId ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(
    initial?.status ?? "active",
  );
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

  const parentOptions = categories.filter((c) => c.id !== initial?.id);

  return (
    <ActionForm
      className="max-w-xl space-y-4"
      action={async () => {
        const payload = {
          name,
          slug: slug || undefined,
          description: description || null,
          parentId: parentId || null,
          status,
          sortOrder: Number(sortOrder) || 0,
        };
        if (mode === "create") {
          const result = await createCategory(payload);
          if (result.ok && result.data?.id) {
            router.push(`/admin/categories/${result.data.id}`);
            router.refresh();
          }
          return result;
        }
        const result = await updateCategory(initial!.id, payload);
        if (result.ok) router.refresh();
        return result;
      }}
    >
      <Field label="نام دسته">
        <input className={inputClassName} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="اسلاگ (اختیاری)">
        <input className={inputClassName} value={slug} onChange={(e) => setSlug(e.target.value)} />
      </Field>
      <Field label="دسته والد">
        <select className={inputClassName} value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">بدون والد (ریشه)</option>
          {parentOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="توضیح">
        <textarea className={inputClassName} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="ترتیب">
        <input
          type="number"
          className={inputClassName}
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </Field>
      <Field label="وضعیت">
        <select className={inputClassName} value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
        </select>
      </Field>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={buttonClassName}>
          {mode === "create" ? "ایجاد دسته" : "ذخیره تغییرات"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={async () => {
              if (!confirm("حذف این دسته؟")) return;
              const result = await deleteCategory(initial!.id);
              if (result.ok) {
                router.push("/admin/categories");
                router.refresh();
              } else {
                alert(result.error);
              }
            }}
          >
            حذف
          </button>
        ) : null}
      </div>
    </ActionForm>
  );
}
