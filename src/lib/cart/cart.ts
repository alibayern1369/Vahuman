import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

import { getServerSession } from "@/lib/auth/session";
import { CART_COOKIE } from "@/lib/cart/constants";
import { ensureUserCart } from "@/lib/cart/merge-service";
import { resolveSellableLine } from "@/lib/cart/sellable";
import { getDb } from "@/lib/db";
import { cartItems, carts } from "@/lib/db/schema";

export { CART_COOKIE } from "@/lib/cart/constants";
export { resolveSellableLine } from "@/lib/cart/sellable";

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

/** Active cart: user cart when logged in, otherwise guest cookie cart. */
export async function ensureActiveCart(): Promise<{ cartId: string }> {
  const session = await getServerSession();
  if (session?.user?.id) {
    return ensureUserCart(session.user.id);
  }
  return ensureGuestCart();
}

async function resolveCartById(cartId: string): Promise<{
  lines: ResolvedCartLine[];
  itemCount: number;
  subtotalToman: number;
}> {
  const db = getDb();
  const items = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));

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
      await db.delete(cartItems).where(eq(cartItems.id, item.id));
    }
  }

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalToman = lines.reduce((sum, line) => sum + line.lineTotalToman, 0);
  return { lines, itemCount, subtotalToman };
}

export async function getResolvedCart(): Promise<{
  lines: ResolvedCartLine[];
  itemCount: number;
  subtotalToman: number;
  cartId: string | null;
}> {
  const session = await getServerSession();
  const db = getDb();

  if (session?.user?.id) {
    const [userCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, session.user.id))
      .limit(1);
    if (!userCart) {
      return { lines: [], itemCount: 0, subtotalToman: 0, cartId: null };
    }
    const resolved = await resolveCartById(userCart.id);
    return { ...resolved, cartId: userCart.id };
  }

  const token = await readGuestToken();
  if (!token) {
    return { lines: [], itemCount: 0, subtotalToman: 0, cartId: null };
  }

  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.guestToken, token))
    .limit(1);
  if (!cart) {
    return { lines: [], itemCount: 0, subtotalToman: 0, cartId: null };
  }

  const resolved = await resolveCartById(cart.id);
  return { ...resolved, cartId: cart.id };
}

export async function addToCart(input: {
  productId: string;
  variantId?: string | null;
  quantity: number;
}) {
  const resolved = await resolveSellableLine(input);
  const { cartId } = await ensureActiveCart();
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

async function assertCartItemOwned(
  itemId: string,
): Promise<typeof cartItems.$inferSelect> {
  const db = getDb();
  const [item] = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.id, itemId))
    .limit(1);
  if (!item) throw new Error("آیتم سبد یافت نشد.");

  const { cartId } = await ensureActiveCart();
  if (item.cartId !== cartId) {
    throw new Error("آیتم سبد یافت نشد.");
  }
  return item;
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const item = await assertCartItemOwned(itemId);
  const db = getDb();

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
  await assertCartItemOwned(itemId);
  await getDb().delete(cartItems).where(eq(cartItems.id, itemId));
}

export { calculateCartSubtotal } from "@/lib/cart/totals";
