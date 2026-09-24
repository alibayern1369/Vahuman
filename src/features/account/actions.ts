"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/lib/auth/session";
import { mergeGuestCartIntoUser } from "@/lib/cart/merge-service";
import { claimAccessibleOrdersForUser } from "@/lib/orders/claim";

/**
 * Called after customer login/register to merge guest cart and claim token-accessible orders.
 */
export async function syncCustomerSessionAction(): Promise<{
  ok: true;
  mergedLines: number;
  claimedOrders: number;
}> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { ok: true, mergedLines: 0, claimedOrders: 0 };
  }

  const merge = await mergeGuestCartIntoUser(session.user.id);
  const claim = await claimAccessibleOrdersForUser(session.user.id);

  revalidatePath("/cart");
  revalidatePath("/account");
  revalidatePath("/account/orders");
  revalidatePath("/", "layout");

  return {
    ok: true,
    mergedLines: merge.mergedLines,
    claimedOrders: claim.claimed,
  };
}
