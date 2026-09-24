/**
 * Inventory helpers (no reservation yet — Phase 2 foundation only).
 */
export function isInStock(options: {
  trackInventory: boolean;
  stockQuantity: number;
}): boolean {
  if (!options.trackInventory) {
    return true;
  }
  return options.stockQuantity > 0;
}

export function assertStockQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error("موجودی باید عدد صحیح غیرمنفی باشد.");
  }
  return value;
}
