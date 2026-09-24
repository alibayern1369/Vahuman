import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export type AppRole = "admin" | "customer";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireAdminSession() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const role = (session.user as { role?: AppRole }).role;
  if (role !== "admin") {
    redirect("/admin/login?error=forbidden");
  }

  return session;
}

/** Customer account area — admins may also enter for support convenience. */
export async function requireCustomerSession(options?: {
  nextPath?: string;
}) {
  const session = await getServerSession();
  if (!session?.user) {
    const next = options?.nextPath
      ? `?next=${encodeURIComponent(options.nextPath)}`
      : "";
    redirect(`/account/login${next}`);
  }
  return session;
}

export function getSessionRole(
  session: Awaited<ReturnType<typeof getServerSession>>,
): AppRole | null {
  if (!session?.user) return null;
  return ((session.user as { role?: AppRole }).role ?? null) as AppRole | null;
}
