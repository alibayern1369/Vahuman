/**
 * Order authorization helpers — prevent IDOR / reference guessing.
 */
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { orders, type Order } from "@/lib/db/schema";
import {
  ORDER_ACCESS_COOKIE,
  parseAccessCookie,
  verifyOrderAccessToken,
} from "@/lib/orders/access";
import { getServerSession } from "@/lib/auth/session";

export async function loadOrderByReference(
  reference: string,
): Promise<Order | null> {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.reference, reference))
    .limit(1);
  return order ?? null;
}

export async function authorizeOrderAccess(
  order: Order,
  options?: { accessTokenFromQuery?: string | null },
): Promise<boolean> {
  const session = await getServerSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "admin") return true;

  if (session?.user?.id && order.userId && session.user.id === order.userId) {
    return true;
  }

  const jar = await cookies();
  const map = parseAccessCookie(jar.get(ORDER_ACCESS_COOKIE)?.value);
  const fromCookie = map.get(order.reference);
  const candidate = options?.accessTokenFromQuery || fromCookie;
  return verifyOrderAccessToken(candidate, order.accessTokenHash);
}

export async function requireOrderAccess(
  reference: string,
  options?: { accessTokenFromQuery?: string | null },
): Promise<Order> {
  const order = await loadOrderByReference(reference);
  if (!order) {
    throw new Error("NOT_FOUND");
  }
  const ok = await authorizeOrderAccess(order, options);
  if (!ok) {
    throw new Error("FORBIDDEN");
  }
  return order;
}
