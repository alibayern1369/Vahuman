/**
 * Receipt submission — never auto-verifies payment.
 */
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { orders, paymentReceipts } from "@/lib/db/schema";
import { recordOrderEvent } from "@/lib/orders/events";
import {
  assertOrderTransition,
  assertPaymentTransition,
  canSubmitReceipt,
} from "@/lib/orders/states";
import {
  assertAllowedReceiptMime,
  assertReceiptSize,
  buildReceiptStorageKey,
  detectReceiptMime,
  getPrivateStorage,
} from "@/lib/storage/private-storage";

export async function submitPaymentReceipt(input: {
  orderId: string;
  fileBuffer: Buffer;
  declaredMimeType: string;
  originalFilename?: string | null;
  transactionReference?: string | null;
  customerNote?: string | null;
}): Promise<{ receiptId: string }> {
  const sniffed = detectReceiptMime(input.fileBuffer);
  if (!sniffed) {
    throw new Error("محتوای فایل رسید قابل تشخیص نیست.");
  }
  const mime = assertAllowedReceiptMime(sniffed);
  // Declared type must agree with sniffed type when provided
  if (
    input.declaredMimeType &&
    assertAllowedReceiptMime(input.declaredMimeType.split(";")[0]!.trim()) !==
      mime
  ) {
    // Allow mismatch only if declared is empty; otherwise require match
    const declared = input.declaredMimeType.toLowerCase().split(";")[0]!.trim();
    if (declared && declared !== mime) {
      throw new Error("نوع فایل با محتوای واقعی مطابقت ندارد.");
    }
  }
  assertReceiptSize(input.fileBuffer.length);

  const db = getDb();
  const storage = getPrivateStorage();
  const storageKey = buildReceiptStorageKey(input.orderId);

  await storage.putObject({
    key: storageKey,
    body: input.fileBuffer,
    mimeType: mime,
  });

  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update")
        .limit(1);
      if (!order) {
        throw new Error("سفارش یافت نشد.");
      }

      if (
        !canSubmitReceipt({
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          reservationExpiresAt: order.reservationExpiresAt,
        })
      ) {
        throw new Error("در این وضعیت امکان ارسال رسید وجود ندارد.");
      }

      const fromPayment = order.paymentStatus;
      const fromOrder = order.orderStatus;
      const nextPayment =
        fromPayment === "receipt_submitted" ? "receipt_submitted" : "receipt_submitted";

      if (fromPayment !== "receipt_submitted") {
        assertPaymentTransition(fromPayment, "receipt_submitted");
      }
      if (fromOrder !== "awaiting_payment_verification") {
        assertOrderTransition(fromOrder, "awaiting_payment_verification");
      }

      const previousActive = await tx
        .select()
        .from(paymentReceipts)
        .where(
          and(
            eq(paymentReceipts.orderId, order.id),
            eq(paymentReceipts.isActive, true),
          ),
        );

      for (const prev of previousActive) {
        await tx
          .update(paymentReceipts)
          .set({ isActive: false })
          .where(eq(paymentReceipts.id, prev.id));
      }

      const [receipt] = await tx
        .insert(paymentReceipts)
        .values({
          orderId: order.id,
          storageKey,
          mimeType: mime,
          fileSize: input.fileBuffer.length,
          originalFilename: input.originalFilename?.slice(0, 200) ?? null,
          transactionReference: input.transactionReference?.trim().slice(0, 120) || null,
          customerNote: input.customerNote?.trim().slice(0, 500) || null,
          isActive: true,
        })
        .returning();

      await tx
        .update(orders)
        .set({
          paymentStatus: "receipt_submitted",
          orderStatus: "awaiting_payment_verification",
          paymentRejectionReason: null,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await recordOrderEvent(tx, {
        orderId: order.id,
        eventType: previousActive.length ? "receipt_replaced" : "receipt_submitted",
        fromOrderStatus: fromOrder,
        toOrderStatus: "awaiting_payment_verification",
        fromPaymentStatus: fromPayment,
        toPaymentStatus: nextPayment,
        actorType: "customer",
        payload: {
          receiptId: receipt.id,
          // Never store file contents in events
          mimeType: mime,
          fileSize: input.fileBuffer.length,
        },
      });

      return { receiptId: receipt.id };
    });
  } catch (error) {
    await storage.deleteObject(storageKey).catch(() => undefined);
    throw error;
  }
}
