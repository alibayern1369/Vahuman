"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  deleteVariant,
  generateProductVariants,
  updateVariant,
} from "@/features/catalog/actions";
import {
  ActionForm,
  Field,
  buttonClassName,
  inputClassName,
  secondaryButtonClassName,
} from "@/features/catalog/components/form-ui";

type Attr = {
  id: string;
  name: string;
  values: Array<{ id: string; value: string }>;
};

type VariantRow = {
  id: string;
  title: string | null;
  sku: string | null;
  priceToman: number | null;
  compareAtPriceToman: number | null;
  stockQuantity: number;
  isActive: boolean;
};

export function VariantManager({
  productId,
  attributes,
  variants,
}: {
  productId: string;
  attributes: Attr[];
  variants: VariantRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const estimated = useMemo(() => {
    const lists = Object.values(selected).filter((v) => v.length > 0);
    if (!lists.length) return 0;
    return lists.reduce((acc, list) => acc * list.length, 1);
  }, [selected]);

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h3 className="font-semibold">تولید واریانت از ویژگی‌ها</h3>
        {attributes.map((attr) => (
          <Field key={attr.id} label={attr.name}>
            <select
              multiple
              className={inputClassName + " min-h-24"}
              value={selected[attr.id] ?? []}
              onChange={(e) =>
                setSelected((prev) => ({
                  ...prev,
                  [attr.id]: Array.from(e.target.selectedOptions).map((o) => o.value),
                }))
              }
            >
              {attr.values.map((value) => (
                <option key={value.id} value={value.id}>
                  {value.value}
                </option>
              ))}
            </select>
          </Field>
        ))}
        <p className="text-sm text-muted">تعداد ترکیب تقریبی: {estimated.toLocaleString("fa-IR")}</p>
        <ActionForm
          action={async () => {
            const payload = {
              productId,
              attributeValueIdsByAttribute: Object.fromEntries(
                Object.entries(selected).filter(([, ids]) => ids.length > 0),
              ),
            };
            const result = await generateProductVariants(payload);
            if (result.ok) router.refresh();
            return result;
          }}
        >
          <button type="submit" className={buttonClassName}>
            تولید واریانت‌ها
          </button>
        </ActionForm>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">واریانت‌های موجود</h3>
        {variants.length === 0 ? (
          <p className="text-muted">هنوز واریانتی ثبت نشده است.</p>
        ) : (
          <ul className="space-y-4">
            {variants.map((variant) => (
              <VariantEditorRow key={variant.id} variant={variant} onChanged={() => router.refresh()} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function VariantEditorRow({
  variant,
  onChanged,
}: {
  variant: VariantRow;
  onChanged: () => void;
}) {
  const [sku, setSku] = useState(variant.sku ?? "");
  const [title, setTitle] = useState(variant.title ?? "");
  const [priceToman, setPriceToman] = useState<number | "">(variant.priceToman ?? "");
  const [compareAtPriceToman, setCompareAtPriceToman] = useState<number | "">(
    variant.compareAtPriceToman ?? "",
  );
  const [stockQuantity, setStockQuantity] = useState(variant.stockQuantity);
  const [isActive, setIsActive] = useState(variant.isActive);

  return (
    <li className="rounded-[var(--radius-lg)] border border-border p-4">
      <ActionForm
        className="grid gap-3 md:grid-cols-2"
        action={async () => {
          const result = await updateVariant({
            id: variant.id,
            sku: sku || null,
            title: title || null,
            priceToman: priceToman === "" ? null : Number(priceToman),
            compareAtPriceToman:
              compareAtPriceToman === "" ? null : Number(compareAtPriceToman),
            stockQuantity: Number(stockQuantity) || 0,
            isActive,
          });
          if (result.ok) onChanged();
          return result;
        }}
      >
        <Field label="عنوان">
          <input className={inputClassName} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="SKU">
          <input className={inputClassName} value={sku} onChange={(e) => setSku(e.target.value)} />
        </Field>
        <Field label="قیمت override (تومان)">
          <input
            type="number"
            className={inputClassName}
            value={priceToman}
            onChange={(e) => setPriceToman(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </Field>
        <Field label="قیمت قبلی">
          <input
            type="number"
            className={inputClassName}
            value={compareAtPriceToman}
            onChange={(e) =>
              setCompareAtPriceToman(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </Field>
        <Field label="موجودی">
          <input
            type="number"
            className={inputClassName}
            value={stockQuantity}
            onChange={(e) => setStockQuantity(Number(e.target.value))}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          فعال
        </label>
        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className={buttonClassName}>
            ذخیره واریانت
          </button>
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={async () => {
              if (!confirm("حذف واریانت؟")) return;
              const result = await deleteVariant(variant.id);
              if (!result.ok) alert(result.error);
              else onChanged();
            }}
          >
            حذف
          </button>
        </div>
      </ActionForm>
    </li>
  );
}
