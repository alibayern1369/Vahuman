"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createBrand,
  deleteBrand,
  updateBrand,
} from "@/features/catalog/actions";
import {
  ActionForm,
  Field,
  buttonClassName,
  inputClassName,
  secondaryButtonClassName,
} from "@/features/catalog/components/form-ui";

type BrandFormProps = {
  mode: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    status: "active" | "inactive";
  };
};

export function BrandForm({ mode, initial }: BrandFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(
    initial?.status ?? "active",
  );

  return (
    <ActionForm
      className="max-w-xl space-y-4"
      action={async () => {
        const payload = {
          name,
          slug: slug || undefined,
          description: description || null,
          logoUrl: logoUrl || null,
          status,
        };
        if (mode === "create") {
          const result = await createBrand(payload);
          if (result.ok && result.data?.id) {
            router.push(`/admin/brands/${result.data.id}`);
            router.refresh();
          }
          return result;
        }
        const result = await updateBrand(initial!.id, payload);
        if (result.ok) router.refresh();
        return result;
      }}
    >
      <Field label="نام برند">
        <input className={inputClassName} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="اسلاگ (اختیاری)">
        <input className={inputClassName} value={slug} onChange={(e) => setSlug(e.target.value)} />
      </Field>
      <Field label="توضیح">
        <textarea className={inputClassName} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="آدرس لوگو (URL موقت)">
        <input className={inputClassName} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </Field>
      <Field label="وضعیت">
        <select className={inputClassName} value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
        </select>
      </Field>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={buttonClassName}>
          {mode === "create" ? "ایجاد برند" : "ذخیره تغییرات"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={async () => {
              if (!confirm("حذف این برند؟")) return;
              const result = await deleteBrand(initial!.id);
              if (result.ok) {
                router.push("/admin/brands");
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
