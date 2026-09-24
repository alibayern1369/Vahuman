/**
 * Pure cart-merge helpers (Phase 5).
 * Guest lines fold into the customer cart; quantities never exceed sellable max.
 */
export function mergeCartLineQuantities(
  customerQty: number,
  guestQty: number,
  maxQuantity: number,
): number {
  if (
    !Number.isInteger(customerQty) ||
    !Number.isInteger(guestQty) ||
    !Number.isInteger(maxQuantity) ||
    customerQty < 0 ||
    guestQty < 0 ||
    maxQuantity < 0
  ) {
    throw new Error("Invalid cart merge quantities");
  }
  return Math.min(customerQty + guestQty, maxQuantity);
}

export type MergeLineKey = {
  productId: string;
  variantId: string | null;
};

export function cartLineKey(line: MergeLineKey): string {
  return `${line.productId}:${line.variantId ?? "base"}`;
}
