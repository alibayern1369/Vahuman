import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { paymentReceipts } from "@/lib/db/schema";
import { getPrivateStorage } from "@/lib/storage/private-storage";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; receiptId: string }>;
};

/**
 * Private receipt download — admin only.
 * Never expose storage keys or public URLs.
 */
export async function GET(_request: Request, { params }: Props) {
  await requireAdminSession();
  const { id: orderId, receiptId } = await params;
  const db = getDb();

  const [receipt] = await db
    .select()
    .from(paymentReceipts)
    .where(
      and(
        eq(paymentReceipts.id, receiptId),
        eq(paymentReceipts.orderId, orderId),
      ),
    )
    .limit(1);

  if (!receipt) notFound();

  const storage = getPrivateStorage();
  const object = await storage.getObject(receipt.storageKey);
  if (!object) notFound();

  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.mimeType,
      "Content-Length": String(object.body.length),
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="receipt-${receiptId.slice(0, 8)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
