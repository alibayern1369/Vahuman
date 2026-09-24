import { requireAdminSession } from "@/lib/auth/session";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

export async function withAdminAction<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    await requireAdminSession();
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "خطای غیرمنتظره رخ داد.";
    return { ok: false, error: message };
  }
}

export function zodErrorMessage(error: {
  flatten: () => {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}): string {
  const flat = error.flatten();
  const field = Object.values(flat.fieldErrors)
    .flat()
    .filter(Boolean)[0];
  return field || flat.formErrors[0] || "اطلاعات وارد شده نامعتبر است.";
}
