"use server";

import { revalidatePath } from "next/cache";

import {
  addToCart,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart/cart";

export type CartActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function addToCartAction(input: {
  productId: string;
  variantId?: string | null;
  quantity: number;
}): Promise<CartActionResult> {
  try {
    await addToCart(input);
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return { ok: true, message: "به سبد اضافه شد." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "خطا در افزودن به سبد",
    };
  }
}

export async function updateCartQuantityAction(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    await updateCartItemQuantity(itemId, quantity);
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "خطا در به‌روزرسانی سبد",
    };
  }
}

export async function removeCartItemAction(
  itemId: string,
): Promise<CartActionResult> {
  try {
    await removeCartItem(itemId);
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "خطا در حذف از سبد",
    };
  }
}
