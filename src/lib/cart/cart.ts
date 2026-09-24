import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

import { isInStock } from "@/lib/catalog/inventory";
import { getDb } from "@/lib/db";
import {
  cartItems,
  carts,
  productVariants,
  products,
} from "@/lib/db/schema";

export const CART_COOKIE = "vahuman_cart";

export type ResolvedCartLine = {
  itemId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  name: string;
  slug: string;
  sku: string | null;
  unitPriceToman: number;
  lineTotalToman: number;
  inStock: boolean;
  maxQuantity: number;
  imageUrl: string | null;
};

async function readGuestToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}

export async function ensureGuestCart(): Promise<{ cartId: string; token: string }> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  const db = getDb();

  if (existing) {
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.guestToken, existing))
      .limit(1);
    if (cart) {
      return { cartId: cart.id, token: existing };
    }
  }

  const token = randomUUID();
  const [cart] = await db
    .insert(carts)
    .values({ guestToken: token })
    .returning({ id: carts.id });

  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { cartId: cart.id, token };
}

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

export async function getResolvedCart(): Promise<{
  lines: ResolvedCartLine[];
  itemCount: number;
  subtotalToman: number;
}> {
  const token = await readGuestToken();
  if (!token) {
    return { lines: [], itemCount: 0, subtotalToman: 0 };
  }

  const db = getDb();
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.guestToken, token))
    .limit(1);
  if (!cart) {
    return { lines: [], itemCount: 0, subtotalToman: 0 };
  }

  const items = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, cart.id));

  const lines: ResolvedCartLine[] = [];
  for (const item of items) {
    try {
      const resolved = await resolveSellableLine({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
      lines.push({
        itemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        name: resolved.product.name,
        slug: resolved.product.slug,
        sku: resolved.variant?.sku ?? resolved.product.sku,
        unitPriceToman: resolved.unitPriceToman,
        lineTotalToman: resolved.unitPriceToman * item.quantity,
        inStock: true,
        maxQuantity: resolved.maxQuantity,
        imageUrl: null,
      });
    } catch {
      // Drop invalid lines silently from display; checkout will revalidate.
      await db.delete(cartItems).where(eq(cartItems.id, item.id));
    }
  }

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalToman = lines.reduce((sum, line) => sum + line.lineTotalToman, 0);
  return { lines, itemCount, subtotalToman };
}

export async function addToCart(input: {
  productId: string;
  variantId?: string | null;
  quantity: number;
}) {
  const resolved = await resolveSellableLine(input);
  const { cartId } = await ensureGuestCart();
  const db = getDb();
  const variantId = resolved.variant?.id ?? null;

  const existing = variantId
    ? await db
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cartId),
            eq(cartItems.productId, input.productId),
            eq(cartItems.variantId, variantId),
          ),
        )
        .limit(1)
    : await db
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cartId),
            eq(cartItems.productId, input.productId),
            isNull(cartItems.variantId),
          ),
        )
        .limit(1);

  const nextQty = (existing[0]?.quantity ?? 0) + input.quantity;
  if (nextQty > resolved.maxQuantity) {
    throw new Error("موجودی کافی برای این تعداد نیست.");
  }

  if (existing[0]) {
    await db
      .update(cartItems)
      .set({ quantity: nextQty, updatedAt: new Date() })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({
      cartId,
      productId: input.productId,
      variantId,
      quantity: input.quantity,
    });
  }

  await db
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.id, itemId))
    .limit(1);
  if (!item) throw new Error("آیتم سبد یافت نشد.");

  if (quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
    return;
  }

  await resolveSellableLine({
    productId: item.productId,
    variantId: item.variantId,
    quantity,
  });

  await db
    .update(cartItems)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, itemId));
}

export async function removeCartItem(itemId: string) {
  await getDb().delete(cartItems).where(eq(cartItems.id, itemId));
}

/** Pure helpers for tests */
export function calculateCartSubtotal(
  lines: Array<{ unitPriceToman: number; quantity: number }>,
): number {
  return lines.reduce((sum, line) => {
    if (!Number.isInteger(line.unitPriceToman) || !Number.isInteger(line.quantity)) {
      throw new Error("Invalid cart money/quantity");
    }
    return sum + line.unitPriceToman * line.quantity;
  }, 0);
}
