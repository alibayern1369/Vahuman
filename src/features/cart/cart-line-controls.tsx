"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  removeCartItemAction,
  updateCartQuantityAction,
} from "@/features/cart/actions";
import { formatToman } from "@/lib/utils/format";

export function CartLineControls({
  itemId,
  quantity,
  lineTotalToman,
}: {
  itemId: string;
  quantity: number;
  lineTotalToman: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">تعداد</span>
        <input
          type="number"
          min={1}
          max={99}
          defaultValue={quantity}
          disabled={pending}
          className="w-20 rounded border border-border bg-background px-2 py-1"
          onChange={(event) => {
            const next = Number(event.target.value) || 1;
            startTransition(async () => {
              await updateCartQuantityAction(itemId, next);
              router.refresh();
            });
          }}
        />
      </label>
      <span className="text-sm font-medium">{formatToman(lineTotalToman)}</span>
      <button
        type="button"
        disabled={pending}
        className="rounded border border-border px-3 py-1 text-sm"
        onClick={() => {
          startTransition(async () => {
            await removeCartItemAction(itemId);
            router.refresh();
          });
        }}
      >
        حذف
      </button>
    </div>
  );
}
