"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import {
  approvePayment,
  cancelOrder,
  rejectPayment,
  transitionFulfillment,
} from "@/lib/orders/admin";
import {
  updateCardToCardSettings,
  updateShippingSettings,
} from "@/lib/orders/settings";

export type AdminActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function approvePaymentAction(
  orderId: string,
): Promise<AdminActionResult> {
  try {
    const session = await requireAdminSession();
    await approvePayment({ orderId, adminUserId: session.user.id });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "پرداخت تأیید شد." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "خطا در تأیید پرداخت",
    };
  }
}

export async function rejectPaymentAction(
  orderId: string,
  reason: string,
): Promise<AdminActionResult> {
  try {
    const session = await requireAdminSession();
    await rejectPayment({ orderId, adminUserId: session.user.id, reason });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "پرداخت رد شد." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "خطا در رد پرداخت",
    };
  }
}

export async function fulfillOrderAction(
  orderId: string,
  toStatus: "processing" | "shipped" | "delivered",
  trackingCode?: string,
): Promise<AdminActionResult> {
  try {
    const session = await requireAdminSession();
    await transitionFulfillment({
      orderId,
      adminUserId: session.user.id,
      toStatus,
      trackingCode,
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "وضعیت سفارش به‌روز شد." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "خطا در به‌روزرسانی وضعیت",
    };
  }
}

export async function cancelOrderAction(
  orderId: string,
  reason?: string,
): Promise<AdminActionResult> {
  try {
    const session = await requireAdminSession();
    await cancelOrder({
      orderId,
      adminUserId: session.user.id,
      reason,
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "سفارش لغو شد." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "خطا در لغو سفارش",
    };
  }
}

export async function savePaymentSettingsAction(
  formData: FormData,
): Promise<void> {
  await requireAdminSession();
  await updateCardToCardSettings({
    cardNumber: String(formData.get("cardNumber") ?? "").replace(/\D/g, ""),
    cardholderName: String(formData.get("cardholderName") ?? ""),
    bankName: String(formData.get("bankName") ?? "") || null,
    instructions: String(formData.get("instructions") ?? "") || null,
    reservationMinutes: Number(formData.get("reservationMinutes") ?? 180),
  });
  const shipping = Number(formData.get("shippingFlatRateToman") ?? 0);
  await updateShippingSettings({ flatRateToman: shipping });
  revalidatePath("/admin/settings");
}
