/**
 * Canonical money unit: Iranian toman as integer (no floating point).
 */
export function assertTomanAmount(
  value: unknown,
  fieldLabel = "قیمت",
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldLabel} باید عدد صحیح غیرمنفی تومان باشد.`);
  }
  return value;
}

export function assertCompareAtPrice(
  priceToman: number,
  compareAtPriceToman: number | null | undefined,
): number | null {
  if (compareAtPriceToman == null) {
    return null;
  }
  const compare = assertTomanAmount(compareAtPriceToman, "قیمت قبلی");
  if (compare > 0 && compare < priceToman) {
    throw new Error("قیمت قبلی نباید کمتر از قیمت فروش باشد.");
  }
  return compare;
}
