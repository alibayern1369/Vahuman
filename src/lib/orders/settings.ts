/**
 * Typed store settings for Phase 4 commerce configuration.
 * Values remain JSON strings in store_settings; validated at the app layer.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { storeSettings } from "@/lib/db/schema";

export const SETTING_KEYS = {
  paymentCardNumber: "payment.cardNumber",
  paymentCardholderName: "payment.cardholderName",
  paymentBankName: "payment.bankName",
  paymentInstructions: "payment.instructions",
  paymentReservationMinutes: "payment.reservationMinutes",
  shippingFlatRateToman: "shipping.flatRateToman",
} as const;

const paymentPublicSchema = z.object({
  cardNumber: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "شماره کارت باید ۱۶ رقم باشد."),
  cardholderName: z.string().trim().min(2).max(120),
  bankName: z.string().trim().max(120).optional().nullable(),
  instructions: z.string().trim().max(2000).optional().nullable(),
  reservationMinutes: z.number().int().min(15).max(60 * 24 * 7).default(180),
});

const shippingSchema = z.object({
  flatRateToman: z.number().int().nonnegative().default(0),
});

export type CardToCardPublicSettings = z.infer<typeof paymentPublicSchema>;
export type ShippingSettings = z.infer<typeof shippingSchema>;

async function writeJsonSetting(key: string, value: unknown): Promise<void> {
  const db = getDb();
  const encoded = JSON.stringify(value);
  await db
    .insert(storeSettings)
    .values({ key, value: encoded })
    .onConflictDoUpdate({
      target: storeSettings.key,
      set: { value: encoded, updatedAt: new Date() },
    });
}

const DEFAULT_PAYMENT: CardToCardPublicSettings = {
  cardNumber: "0000000000000000",
  cardholderName: "وهومن",
  bankName: null,
  instructions:
    "مبلغ دقیق سفارش را به کارت زیر واریز کنید و سپس تصویر رسید را بارگذاری نمایید. تأیید پرداخت فقط توسط پشتیبانی انجام می‌شود.",
  reservationMinutes: 180,
};

function parseStored<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getCardToCardSettings(): Promise<CardToCardPublicSettings> {
  const db = getDb();
  const rows = await db.select().from(storeSettings);
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const candidate = {
    cardNumber: parseStored(
      map.get(SETTING_KEYS.paymentCardNumber),
      DEFAULT_PAYMENT.cardNumber,
    ),
    cardholderName: parseStored(
      map.get(SETTING_KEYS.paymentCardholderName),
      DEFAULT_PAYMENT.cardholderName,
    ),
    bankName: parseStored(
      map.get(SETTING_KEYS.paymentBankName),
      DEFAULT_PAYMENT.bankName,
    ),
    instructions: parseStored(
      map.get(SETTING_KEYS.paymentInstructions),
      DEFAULT_PAYMENT.instructions,
    ),
    reservationMinutes: parseStored(
      map.get(SETTING_KEYS.paymentReservationMinutes),
      DEFAULT_PAYMENT.reservationMinutes,
    ),
  };

  const result = paymentPublicSchema.safeParse(candidate);
  return result.success ? result.data : DEFAULT_PAYMENT;
}

export async function getPublicPaymentInstructions(): Promise<CardToCardPublicSettings> {
  return getCardToCardSettings();
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.key, SETTING_KEYS.shippingFlatRateToman))
    .limit(1);
  if (!row) return { flatRateToman: 0 };
  try {
    const value = JSON.parse(row.value) as unknown;
    if (typeof value === "number") {
      return shippingSchema.parse({ flatRateToman: value });
    }
    return shippingSchema.parse(value);
  } catch {
    return { flatRateToman: 0 };
  }
}

export async function updateCardToCardSettings(
  input: Partial<CardToCardPublicSettings>,
): Promise<CardToCardPublicSettings> {
  const current = await getCardToCardSettings();
  const merged = paymentPublicSchema.parse({ ...current, ...input });
  await writeJsonSetting(SETTING_KEYS.paymentCardNumber, merged.cardNumber);
  await writeJsonSetting(
    SETTING_KEYS.paymentCardholderName,
    merged.cardholderName,
  );
  await writeJsonSetting(SETTING_KEYS.paymentBankName, merged.bankName ?? null);
  await writeJsonSetting(
    SETTING_KEYS.paymentInstructions,
    merged.instructions ?? null,
  );
  await writeJsonSetting(
    SETTING_KEYS.paymentReservationMinutes,
    merged.reservationMinutes,
  );
  return merged;
}

export async function updateShippingSettings(
  input: ShippingSettings,
): Promise<ShippingSettings> {
  const parsed = shippingSchema.parse(input);
  await writeJsonSetting(
    SETTING_KEYS.shippingFlatRateToman,
    parsed.flatRateToman,
  );
  return parsed;
}

export function formatCardNumberDisplay(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1-");
}
