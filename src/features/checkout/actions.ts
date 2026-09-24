"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { getServerSession } from "@/lib/auth/session";
import { CART_COOKIE, ensureGuestCart, getResolvedCart } from "@/lib/cart/cart";
import {
  ORDER_ACCESS_COOKIE,
  parseAccessCookie,
  serializeAccessCookie,
} from "@/lib/orders/access";
import {
  checkoutCustomerSchema,
  createOrderFromCart,
} from "@/lib/orders/checkout";
import { submitPaymentReceipt } from "@/lib/orders/receipts";
import { requireOrderAccess } from "@/lib/orders/authorize";

export type ActionResult =
  | { ok: true; message?: string; reference?: string }
  | { ok: false; error: string };

export async function placeOrderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const raw = {
      fullName: String(formData.get("fullName") ?? ""),
      mobile: String(formData.get("mobile") ?? ""),
      province: String(formData.get("province") ?? ""),
      city: String(formData.get("city") ?? ""),
      address: String(formData.get("address") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      customerNote: String(formData.get("customerNote") ?? "") || null,
      idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    };

    const parsed = checkoutCustomerSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است.",
      };
    }

    const cart = await getResolvedCart();
    if (!cart.lines.length) {
      return { ok: false, error: "سبد خرید خالی است." };
    }

    const { cartId } = await ensureGuestCart();
    const session = await getServerSession();
    const userId = session?.user?.id ?? null;

    const result = await createOrderFromCart({
      cartId,
      customer: parsed.data,
      userId,
    });

    if (result.accessToken) {
      const jar = await cookies();
      const map = parseAccessCookie(jar.get(ORDER_ACCESS_COOKIE)?.value);
      map.set(result.reference, result.accessToken);
      jar.set(ORDER_ACCESS_COOKIE, serializeAccessCookie(map), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    revalidatePath("/cart");
    revalidatePath("/", "layout");
    redirect(`/order/${result.reference}/payment`);
  } catch (error) {
    // Next.js redirect throws; rethrow
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "خطا در ثبت سفارش",
    };
  }
}

export async function submitReceiptAction(
  reference: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const order = await requireOrderAccess(reference);
    const file = formData.get("receipt");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "لطفاً تصویر یا PDF رسید را انتخاب کنید." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    await submitPaymentReceipt({
      orderId: order.id,
      fileBuffer: buffer,
      declaredMimeType: file.type || "application/octet-stream",
      originalFilename: file.name,
      transactionReference: String(formData.get("transactionReference") ?? "") || null,
      customerNote: String(formData.get("customerNote") ?? "") || null,
    });
    revalidatePath(`/order/${reference}`);
    revalidatePath(`/order/${reference}/payment`);
    return { ok: true, message: "رسید دریافت شد و در انتظار تأیید است." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "خطا در ارسال رسید";
    if (msg === "FORBIDDEN" || msg === "NOT_FOUND") {
      return { ok: false, error: "دسترسی به این سفارش مجاز نیست." };
    }
    return { ok: false, error: msg };
  }
}

export async function ensureCheckoutIdempotencyKey(): Promise<string> {
  return randomUUID();
}

/** Exported for tests / unused cart cookie helper silence */
export async function _readCartCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}
