import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerAuthForm } from "@/features/account/customer-auth-form";
import { appConfig } from "@/config/app";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `ورود | ${appConfig.name}`,
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function AccountLoginPage({ searchParams }: Props) {
  const session = await getServerSession();
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") ? sp.next : "/account";

  if (session?.user) {
    redirect(next);
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-center text-3xl font-bold">ورود به حساب</h1>
      <p className="mb-8 text-center text-muted">
        سفارش‌های متصل به حساب خود را ببینید.
      </p>
      <CustomerAuthForm mode="login" nextPath={next} />
    </div>
  );
}
