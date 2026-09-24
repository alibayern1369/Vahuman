import type { Category } from "@/lib/db/schema";

export type CategoryNode = Category & { children: CategoryNode[] };

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const category of categories) {
    byId.set(category.id, { ...category, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fa"));
    for (const child of nodes) {
      sortRecursive(child.children);
    }
  };
  sortRecursive(roots);
  return roots;
}

/** Detect whether assigning parentId would create a cycle. */
export function wouldCreateCategoryCycle(
  categories: Array<Pick<Category, "id" | "parentId">>,
  categoryId: string,
  nextParentId: string | null,
): boolean {
  if (!nextParentId) {
    return false;
  }
  if (nextParentId === categoryId) {
    return true;
  }

  const parentById = new Map(categories.map((c) => [c.id, c.parentId]));
  let current: string | null = nextParentId;
  const seen = new Set<string>();
  while (current) {
    if (current === categoryId) {
      return true;
    }
    if (seen.has(current)) {
      return true;
    }
    seen.add(current);
    current = parentById.get(current) ?? null;
  }
  return false;
}

export function collectDescendantIds(
  categories: Array<Pick<Category, "id" | "parentId">>,
  rootId: string,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = childrenByParent.get(category.parentId) ?? [];
    list.push(category.id);
    childrenByParent.set(category.parentId, list);
  }

  const result: string[] = [];
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    result.push(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }
  return result;
}
