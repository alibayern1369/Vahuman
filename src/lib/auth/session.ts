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
