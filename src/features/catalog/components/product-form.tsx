"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createProduct,
  deleteProduct,
  setProductStatus,
  updateProduct,
} from "@/features/catalog/actions";
import {
  ActionForm,
  Field,
  buttonClassName,
  inputClassName,
  secondaryButtonClassName,
} from "@/features/catalog/components/form-ui";

type Option = { id: string; name: string };

type Spec = { label: string; value: string; sortOrder: number };
type Media = { url: string; alt?: string | null; sortOrder: number; isPrimary: boolean };

type ProductFormProps = {
  mode: "create" | "edit";
  brands: Option[];
  categories: Option[];
  initial?: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    description: string | null;
    sku: string | null;
    brandId: string | null;
    categoryIds: string[];
    primaryCategoryId: string | null;
    status: "draft" | "published" | "archived";
    priceToman: number;
    compareAtPriceToman: number | null;
    trackInventory: boolean;
    stockQuantity: number;
    isFeatured: boolean;
    seoTitle: string | null;
    seoDescription: string | null;
    specifications: Spec[];
    media: Media[];
  };
};

export function ProductForm({ mode, brands, categories, initial }: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [brandId, setBrandId] = useState(initial?.brandId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [primaryCategoryId, setPrimaryCategoryId] = useState(initial?.primaryCategoryId ?? "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(initial?.status ?? "draft");
  const [priceToman, setPriceToman] = useState(initial?.priceToman ?? 0);
  const [compareAtPriceToman, setCompareAtPriceToman] = useState<number | "">(
    initial?.compareAtPriceToman ?? "",
  );
  const [trackInventory, setTrackInventory] = useState(initial?.trackInventory ?? true);
  const [stockQuantity, setStockQuantity] = useState(initial?.stockQuantity ?? 0);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");
  const [specsText, setSpecsText] = useState(
    (initial?.specifications ?? [])
      .map((s) => `${s.label}: ${s.value}`)
      .join("\n"),
  );
  const [mediaText, setMediaText] = useState(
    (initial?.media ?? []).map((m) => m.url).join("\n"),
  );

  const payload = useMemo(() => {
    const specifications = specsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [label, ...rest] = line.split(":");
        return {
          label: (label || "").trim(),
          value: rest.join(":").trim() || "-",
          sortOrder: index,
        };
      })
      .filter((s) => s.label);

    const media = mediaText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((url, index) => ({
        url,
        alt: name,
        sortOrder: index,
        isPrimary: index === 0,
      }));

    return {
      name,
      slug: slug || undefined,
      shortDescription: shortDescription || null,
      description: description || null,
      sku: sku || null,
      brandId: brandId || null,
      categoryIds,
      primaryCategoryId: primaryCategoryId || null,
      status,
      priceToman: Number(priceToman) || 0,
      compareAtPriceToman:
        compareAtPriceToman === "" ? null : Number(compareAtPriceToman),
      trackInventory,
      stockQuantity: Number(stockQuantity) || 0,
      isFeatured,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      specifications,
      media,
    };
  }, [
    name,
    slug,
    shortDescription,
    description,
    sku,
    brandId,
    categoryIds,
    primaryCategoryId,
    status,
    priceToman,
    compareAtPriceToman,
    trackInventory,
    stockQuantity,
    isFeatured,
    seoTitle,
    seoDescription,
    specsText,
    mediaText,
  ]);

  return (
    <ActionForm
      className="space-y-4"
      action={async () => {
        if (mode === "create") {
          const result = await createProduct(payload);
          if (result.ok && result.data?.id) {
            router.push(`/admin/products/${result.data.id}`);
            router.refresh();
          }
          return result;
        }
        const result = await updateProduct(initial!.id, payload);
        if (result.ok) router.refresh();
        return result;
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="نام محصول">
          <input className={inputClassName} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="اسلاگ">
          <input className={inputClassName} value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <Field label="SKU">
          <input className={inputClassName} value={sku} onChange={(e) => setSku(e.target.value)} />
        </Field>
        <Field label="وضعیت">
          <select className={inputClassName} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="draft">پیش‌نویس</option>
            <option value="published">منتشرشده</option>
            <option value="archived">بایگانی</option>
          </select>
        </Field>
        <Field label="قیمت فروش (تومان)">
          <input type="number" className={inputClassName} value={priceToman} onChange={(e) => setPriceToman(Number(e.target.value))} />
        </Field>
        <Field label="قیمت قبلی / مقایسه‌ای (تومان)">
          <input
            type="number"
            className={inputClassName}
            value={compareAtPriceToman}
            onChange={(e) =>
              setCompareAtPriceToman(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </Field>
        <Field label="برند">
          <select className={inputClassName} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            <option value="">بدون برند</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="موجودی (بدون واریانت)">
          <input type="number" className={inputClassName} value={stockQuantity} onChange={(e) => setStockQuantity(Number(e.target.value))} />
        </Field>
      </div>

      <Field label="توضیح کوتاه">
        <textarea className={inputClassName} rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
      </Field>
      <Field label="توضیح کامل">
        <textarea className={inputClassName} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <Field label="دسته‌ها (چند انتخابی با Ctrl/Cmd)">
        <select
          multiple
          className={inputClassName + " min-h-28"}
          value={categoryIds}
          onChange={(e) =>
            setCategoryIds(Array.from(e.target.selectedOptions).map((o) => o.value))
          }
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="دسته اصلی">
        <select className={inputClassName} value={primaryCategoryId} onChange={(e) => setPrimaryCategoryId(e.target.value)}>
          <option value="">خودکار (اولین دسته)</option>
          {categoryIds.map((id) => {
            const cat = categories.find((c) => c.id === id);
            return (
              <option key={id} value={id}>
                {cat?.name ?? id}
              </option>
            );
          })}
        </select>
      </Field>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={trackInventory} onChange={(e) => setTrackInventory(e.target.checked)} />
          ردیابی موجودی
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          محصول ویژه
        </label>
      </div>

      <Field label="عنوان سئو">
        <input className={inputClassName} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
      </Field>
      <Field label="توضیح سئو">
        <textarea className={inputClassName} rows={2} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
      </Field>

      <Field label="مشخصات فنی (هر خط: برچسب: مقدار)">
        <textarea className={inputClassName} rows={4} value={specsText} onChange={(e) => setSpecsText(e.target.value)} placeholder={"جنس: پنبه\nوزن: ۲۰۰ گرم"} />
      </Field>
      <Field label="رسانه محصول — هر خط یک URL (بدون ذخیره باینری)">
        <textarea className={inputClassName} rows={3} value={mediaText} onChange={(e) => setMediaText(e.target.value)} placeholder="https://cdn.example.com/p1.webp" />
      </Field>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={buttonClassName}>
          {mode === "create" ? "ایجاد محصول" : "ذخیره محصول"}
        </button>
        {mode === "edit" ? (
          <>
            <button
              type="button"
              className={secondaryButtonClassName}
              onClick={async () => {
                const next = status === "archived" ? "draft" : "archived";
                const result = await setProductStatus(initial!.id, next);
                if (!result.ok) alert(result.error);
                else {
                  setStatus(next);
                  router.refresh();
                }
              }}
            >
              {status === "archived" ? "خروج از بایگانی" : "بایگانی"}
            </button>
            <button
              type="button"
              className={secondaryButtonClassName}
              onClick={async () => {
                if (!confirm("حذف محصول؟ فقط پیش‌نویس/بایگانی مجاز است.")) return;
                const result = await deleteProduct(initial!.id);
                if (!result.ok) alert(result.error);
                else {
                  router.push("/admin/products");
                  router.refresh();
                }
              }}
            >
              حذف
            </button>
          </>
        ) : null}
      </div>
    </ActionForm>
  );
}
