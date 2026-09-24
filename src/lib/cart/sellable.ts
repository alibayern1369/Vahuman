import { and, eq } from "drizzle-orm";

import { isInStock } from "@/lib/catalog/inventory";
import { getDb } from "@/lib/db";
import { productVariants, products } from "@/lib/db/schema";

export async function resolveSellableLine(input: {
  productId: string;
  variantId?: string | null;
  quantity: number;
}) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error("تعداد باید عدد صحیح حداقل ۱ باشد.");
  }
  if (input.quantity > 99) {
    throw new Error("حداکثر تعداد مجاز ۹۹ است.");
  }

  const db = getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.status, "published")))
    .limit(1);
  if (!product) {
    throw new Error("محصول در دسترس نیست.");
  }

  if (input.variantId) {
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, input.variantId),
          eq(productVariants.productId, product.id),
          eq(productVariants.isActive, true),
        ),
      )
      .limit(1);
    if (!variant) {
      throw new Error("واریانت انتخاب‌شده نامعتبر است.");
    }
    const stock = variant.stockQuantity;
    if (
      product.trackInventory &&
      !isInStock({ trackInventory: true, stockQuantity: stock })
    ) {
      throw new Error("این واریانت موجود نیست.");
    }
    if (product.trackInventory && input.quantity > stock) {
      throw new Error("موجودی کافی نیست.");
    }
    return {
      product,
      variant,
      unitPriceToman: variant.priceToman ?? product.priceToman,
      maxQuantity: product.trackInventory ? stock : 99,
    };
  }

  const variants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, product.id),
        eq(productVariants.isActive, true),
      ),
    )
    .limit(1);
  if (variants.length) {
    throw new Error("برای این محصول باید واریانت انتخاب شود.");
  }

  if (
    product.trackInventory &&
    !isInStock({
      trackInventory: true,
      stockQuantity: product.stockQuantity,
    })
  ) {
    throw new Error("محصول موجود نیست.");
  }
  if (product.trackInventory && input.quantity > product.stockQuantity) {
    throw new Error("موجودی کافی نیست.");
  }

  return {
    product,
    variant: null,
    unitPriceToman: product.priceToman,
    maxQuantity: product.trackInventory ? product.stockQuantity : 99,
  };
}
