"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createAttribute,
  createAttributeValue,
  deleteAttribute,
  deleteAttributeValue,
  updateAttribute,
} from "@/features/catalog/actions";
import {
  ActionForm,
  Field,
  buttonClassName,
  inputClassName,
  secondaryButtonClassName,
} from "@/features/catalog/components/form-ui";

type AttributeBundle = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  status: "active" | "inactive";
  values: Array<{
    id: string;
    value: string;
    slug: string;
    metadata: Record<string, unknown> | null;
    status: "active" | "inactive";
  }>;
};

export function AttributesManager({ items }: { items: AttributeBundle[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const [valueText, setValueText] = useState("");
  const [hex, setHex] = useState("");

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">ویژگی‌ها</h3>
        <ActionForm
          className="space-y-3"
          action={async () => {
            const result = await createAttribute({ name, status: "active", sortOrder: 0 });
            if (result.ok) {
              setName("");
              router.refresh();
            }
            return result;
          }}
        >
          <Field label="نام ویژگی جدید (مثلاً رنگ)">
            <input className={inputClassName} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <button type="submit" className={buttonClassName}>
            افزودن ویژگی
          </button>
        </ActionForm>

        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2">
              <button type="button" className="text-start" onClick={() => setSelectedId(item.id)}>
                <span className="font-medium">{item.name}</span>
                <span className="ms-2 text-xs text-muted">{item.values.length} مقدار</span>
              </button>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={async () => {
                  if (!confirm("حذف ویژگی؟")) return;
                  const result = await deleteAttribute(item.id);
                  if (!result.ok) alert(result.error);
                  router.refresh();
                }}
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">مقادیر ویژگی</h3>
        {!selected ? (
          <p className="text-muted">ابتدا یک ویژگی انتخاب کنید.</p>
        ) : (
          <>
            <ActionForm
              className="space-y-3"
              action={async () => {
                const result = await updateAttribute(selected.id, {
                  name: selected.name,
                  slug: selected.slug,
                  sortOrder: selected.sortOrder,
                  status: selected.status,
                });
                if (result.ok) router.refresh();
                return result;
              }}
            >
              <p className="text-sm text-muted">ویژگی انتخاب‌شده: {selected.name}</p>
            </ActionForm>

            <ActionForm
              className="space-y-3"
              action={async () => {
                const result = await createAttributeValue({
                  attributeId: selected.id,
                  value: valueText,
                  hex: hex || null,
                  status: "active",
                  sortOrder: selected.values.length,
                });
                if (result.ok) {
                  setValueText("");
                  setHex("");
                  router.refresh();
                }
                return result;
              }}
            >
              <Field label="مقدار جدید">
                <input className={inputClassName} value={valueText} onChange={(e) => setValueText(e.target.value)} required />
              </Field>
              <Field label="کد رنگ اختیاری (مثلاً #000000)">
                <input className={inputClassName} value={hex} onChange={(e) => setHex(e.target.value)} />
              </Field>
              <button type="submit" className={buttonClassName}>
                افزودن مقدار
              </button>
            </ActionForm>

            <ul className="space-y-2">
              {selected.values.map((value) => (
                <li key={value.id} className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border px-3 py-2">
                  <span>
                    {value.value}
                    {typeof value.metadata?.hex === "string" ? (
                      <span className="ms-2 text-xs text-muted">{value.metadata.hex}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    onClick={async () => {
                      const result = await deleteAttributeValue(value.id);
                      if (!result.ok) alert(result.error);
                      router.refresh();
                    }}
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
