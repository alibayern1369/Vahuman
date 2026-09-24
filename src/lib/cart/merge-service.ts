/**
 * Guest cart → customer cart merge (Phase 5).
 * Idempotent when guest cart is empty or already consumed.
 */
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";

import { CART_COOKIE } from "@/lib/cart/constants";
import { mergeCartLineQuantities } from "@/lib/cart/merge";
import { resolveSellableLine } from "@/lib/cart/sellable";
import { getDb } from "@/lib/db";
import { cartItems, carts } from "@/lib/db/schema";

export type MergeResult = {
  mergedLines: number;
  guestCartDeleted: boolean;
};

export async function ensureUserCart(userId: string): Promise<{ cartId: string }> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);
  if (existing) return { cartId: existing.id };

  const [created] = await db
    .insert(carts)
    .values({ userId, guestToken: null })
    .returning({ id: carts.id });
  return { cartId: created.id };
}

/**
 * Move guest cookie cart lines into the authenticated user's cart, then drop the guest cart.
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<MergeResult> {
  const jar = await cookies();
  const guestToken = jar.get(CART_COOKIE)?.value;
  if (!guestToken) {
    return { mergedLines: 0, guestCartDeleted: false };
  }

  const db = getDb();
  const [guestCart] = await db
    .select()
    .from(carts)
    .where(eq(carts.guestToken, guestToken))
    .limit(1);

  if (!guestCart) {
    jar.delete(CART_COOKIE);
    return { mergedLines: 0, guestCartDeleted: false };
  }

  // Already the user cart somehow — just clear guest marker
  if (guestCart.userId === userId) {
    await db
      .update(carts)
      .set({ guestToken: null, updatedAt: new Date() })
      .where(eq(carts.id, guestCart.id));
    jar.delete(CART_COOKIE);
    return { mergedLines: 0, guestCartDeleted: true };
  }

  const { cartId: userCartId } = await ensureUserCart(userId);

  if (guestCart.id === userCartId) {
    jar.delete(CART_COOKIE);
    return { mergedLines: 0, guestCartDeleted: false };
  }

  const guestLines = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, guestCart.id));

  let mergedLines = 0;

  for (const line of guestLines) {
    try {
      const resolved = await resolveSellableLine({
        productId: line.productId,
        variantId: line.variantId,
        quantity: 1,
      });
      const variantId = line.variantId;

      const existing = variantId
        ? await db
            .select()
            .from(cartItems)
            .where(
              and(
                eq(cartItems.cartId, userCartId),
                eq(cartItems.productId, line.productId),
                eq(cartItems.variantId, variantId),
              ),
            )
            .limit(1)
        : await db
            .select()
            .from(cartItems)
            .where(
              and(
                eq(cartItems.cartId, userCartId),
                eq(cartItems.productId, line.productId),
                isNull(cartItems.variantId),
              ),
            )
            .limit(1);

      const nextQty = mergeCartLineQuantities(
        existing[0]?.quantity ?? 0,
        line.quantity,
        resolved.maxQuantity,
      );

      if (existing[0]) {
        await db
          .update(cartItems)
          .set({ quantity: nextQty, updatedAt: new Date() })
          .where(eq(cartItems.id, existing[0].id));
      } else if (nextQty > 0) {
        await db.insert(cartItems).values({
          cartId: userCartId,
          productId: line.productId,
          variantId,
          quantity: nextQty,
        });
      }
      mergedLines += 1;
    } catch {
      // Skip unsellable guest lines
    }
  }

  await db.delete(cartItems).where(eq(cartItems.cartId, guestCart.id));
  await db.delete(carts).where(eq(carts.id, guestCart.id));
  jar.delete(CART_COOKIE);

  await db
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, userCartId));

  return { mergedLines, guestCartDeleted: true };
}
