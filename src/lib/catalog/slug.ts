/**
 * URL-safe slug helper with Unicode/Persian letter support.
 */
export function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "item";
}

export function withSlugCollisionSuffix(base: string, attempt: number): string {
  if (attempt <= 1) {
    return base;
  }
  return `${base}-${attempt}`;
}

export async function ensureUniqueSlug(
  baseInput: string,
  exists: (slug: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  const base = slugify(baseInput);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidate = withSlugCollisionSuffix(base, attempt);
    if (!(await exists(candidate))) {
      return candidate;
    }
  }
  throw new Error("امکان ساخت اسلاگ یکتا وجود ندارد.");
}
