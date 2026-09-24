import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/features/admin/components/admin-login-form";
import { appConfig } from "@/config/app";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession();
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/admin") ? params.next : "/admin";

  if (session?.user && (session.user as { role?: string }).role === "admin") {
    redirect(nextPath);
  }

  const initialError =
    params.error === "forbidden"
      ? "دسترسی فقط برای مدیران مجاز است."
      : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <p className="mb-2 text-sm text-muted">{appConfig.adminTitle}</p>
      <h1 className="mb-2 text-3xl font-bold">{appConfig.name}</h1>
      <p className="mb-8 text-muted">
        ورود امن به پنل مدیریت {appConfig.nameLatin}
      </p>
      <AdminLoginForm nextPath={nextPath} initialError={initialError} />
    </main>
  );
}
