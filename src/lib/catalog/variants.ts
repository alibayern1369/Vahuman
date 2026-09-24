/**
 * Deterministic variant combination key from attribute value IDs.
 */
export function buildCombinationKey(attributeValueIds: string[]): string {
  const unique = [...new Set(attributeValueIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("ترکیب ویژگی برای واریانت خالی است.");
  }
  return unique.sort((a, b) => a.localeCompare(b)).join("|");
}

export function cartesianProduct<T>(lists: T[][]): T[][] {
  if (lists.length === 0) {
    return [];
  }
  return lists.reduce<T[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]],
  );
}
