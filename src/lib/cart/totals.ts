/** Pure cart money helpers (safe to import in unit tests without auth). */
export function calculateCartSubtotal(
  lines: Array<{ unitPriceToman: number; quantity: number }>,
): number {
  return lines.reduce((sum, line) => {
    if (!Number.isInteger(line.unitPriceToman) || !Number.isInteger(line.quantity)) {
      throw new Error("Invalid cart money/quantity");
    }
    return sum + line.unitPriceToman * line.quantity;
  }, 0);
}
