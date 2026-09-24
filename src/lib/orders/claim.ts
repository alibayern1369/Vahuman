/**
 * Attach guest-accessed orders to an authenticated customer account.
 * Only links when access token proves ownership and order.userId is still null.
 */
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import {
  ORDER_ACCESS_COOKIE,
  parseAccessCookie,
  verifyOrderAccessToken,
} from "@/lib/orders/access";
import { recordOrderEvent } from "@/lib/orders/events";

export async function claimAccessibleOrdersForUser(
  userId: string,
): Promise<{ claimed: number }> {
  const jar = await cookies();
  const map = parseAccessCookie(jar.get(ORDER_ACCESS_COOKIE)?.value);
  if (map.size === 0) return { claimed: 0 };

  const db = getDb();
  let claimed = 0;

  for (const [reference, token] of map.entries()) {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.reference, reference), isNull(orders.userId)))
      .limit(1);
    if (!order) continue;
    if (!verifyOrderAccessToken(token, order.accessTokenHash)) continue;

    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, order.id), isNull(orders.userId)))
        .for("update")
        .limit(1);
      if (!locked) return;

      await tx
        .update(orders)
        .set({ userId, updatedAt: new Date() })
        .where(eq(orders.id, locked.id));

      await recordOrderEvent(tx, {
        orderId: locked.id,
        eventType: "order_claimed_by_customer",
        actorType: "customer",
        actorUserId: userId,
        payload: { reference: locked.reference },
      });
      claimed += 1;
    });
  }

  return { claimed };
}

export async function claimOrderIfAuthorized(input: {
  orderId: string;
  userId: string;
  accessToken?: string | null;
}): Promise<boolean> {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);
  if (!order || order.userId) return false;

  const jar = await cookies();
  const map = parseAccessCookie(jar.get(ORDER_ACCESS_COOKIE)?.value);
  const token = input.accessToken || map.get(order.reference);
  if (!verifyOrderAccessToken(token, order.accessTokenHash)) return false;

  await db
    .update(orders)
    .set({ userId: input.userId, updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), isNull(orders.userId)));
  return true;
}
