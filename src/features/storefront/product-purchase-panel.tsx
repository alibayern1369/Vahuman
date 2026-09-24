"use client";

import { useMemo, useState, useTransition } from "react";

import { addToCartAction } from "@/features/cart/actions";
import { formatToman } from "@/lib/utils/format";

type Variant = {
  id: string;
  title: string | null;
  sku: string | null;
  unitPriceToman: number;
  compareAtPriceToman: number | null;
  inStock: boolean;
  options: Array<{
    attributeId: string;
    attributeName: string;
    attributeValueId: string;
    value: string;
  }>;
};

export function ProductPurchasePanel({
  productId,
  basePriceToman,
  baseCompareAt,
  baseSku,
  baseInStock,
  variants,
}: {
  productId: string;
  basePriceToman: number;
  baseCompareAt: number | null;
  baseSku: string | null;
  baseInStock: boolean;
  variants: Variant[];
}) {
  const attributeNames = useMemo(() => {
    const map = new Map<string, { id: string; name: string; values: Map<string, string> }>();
    for (const variant of variants) {
      for (const opt of variant.options) {
        const entry = map.get(opt.attributeId) ?? {
          id: opt.attributeId,
          name: opt.attributeName,
          values: new Map<string, string>(),
        };
        entry.values.set(opt.attributeValueId, opt.value);
        map.set(opt.attributeId, entry);
      }
    }
    return [...map.values()];
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    const selectedIds = Object.values(selected);
    if (selectedIds.length < attributeNames.length) return null;
    return (
      variants.find((variant) =>
        selectedIds.every((id) =>
          variant.options.some((o) => o.attributeValueId === id),
        ),
      ) ?? null
    );
  }, [attributeNames.length, selected, variants]);

  const price = selectedVariant?.unitPriceToman ?? basePriceToman;
  const compareAt = selectedVariant?.compareAtPriceToman ?? baseCompareAt;
  const sku = selectedVariant?.sku ?? baseSku;
  const inStock = selectedVariant ? selectedVariant.inStock : baseInStock;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-2xl font-bold">{formatToman(price)}</p>
        {compareAt != null && compareAt > price ? (
          <p className="text-sm text-muted line-through">{formatToman(compareAt)}</p>
        ) : null}
        <p className={`mt-2 text-sm ${inStock ? "text-muted" : "text-red-700"}`}>
          {inStock ? "موجود در انبار" : "ناموجود"}
        </p>
        {sku ? <p className="mt-1 text-xs text-muted">SKU: {sku}</p> : null}
      </div>

      {attributeNames.map((attr) => (
        <fieldset key={attr.id} className="space-y-2">
          <legend className="text-sm text-muted">{attr.name}</legend>
          <div className="flex flex-wrap gap-2">
            {[...attr.values.entries()].map(([valueId, label]) => {
              const active = selected[attr.id] === valueId;
              return (
                <button
                  key={valueId}
                  type="button"
                  className={`rounded-[var(--radius-lg)] border px-3 py-1.5 text-sm ${
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-surface"
                  }`}
                  onClick={() =>
                    setSelected((prev) => ({ ...prev, [attr.id]: valueId }))
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <label className="block space-y-2 text-sm">
        <span className="text-muted">تعداد</span>
        <input
          type="number"
          min={1}
          max={99}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value) || 1)}
          className="w-28 rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2"
        />
      </label>

      <button
        type="button"
        disabled={pending || !inStock || (variants.length > 0 && !selectedVariant)}
        className="w-full rounded-[var(--radius-lg)] bg-accent px-4 py-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
        onClick={() => {
          setError("");
          setMessage("");
          startTransition(async () => {
            if (variants.length > 0 && !selectedVariant) {
              setError("لطفاً واریانت را کامل انتخاب کنید.");
              return;
            }
            const result = await addToCartAction({
              productId,
              variantId: selectedVariant?.id ?? null,
              quantity,
            });
            if (!result.ok) setError(result.error);
            else setMessage(result.message || "انجام شد.");
          });
        }}
      >
        {pending ? "در حال افزودن…" : "افزودن به سبد"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-accent">{message}</p> : null}
    </div>
  );
}
