"use client";

import Link from "next/link";

import { appConfig } from "@/config/app";
import { authClient } from "@/lib/auth/client";

const navItems = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/orders", label: "سفارش‌ها" },
  { href: "/admin/products", label: "محصولات" },
  { href: "/admin/categories", label: "دسته‌ها" },
  { href: "/admin/brands", label: "برندها" },
  { href: "/admin/attributes", label: "ویژگی‌ها" },
  { href: "/admin/settings", label: "تنظیمات" },
] as const;

type AdminShellProps = {
  email: string;
  children: React.ReactNode;
};

export function AdminShell({ email, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted">{appConfig.adminTitle}</p>
            <h1 className="text-xl font-bold tracking-tight">
              {appConfig.name}{" "}
              <span className="text-sm font-medium tracking-[0.18em] text-muted">
                {appConfig.nameLatin}
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted">{email}</span>
            <button
              type="button"
              className="rounded-[var(--radius-lg)] border border-border px-3 py-1.5 transition hover:bg-background"
              onClick={() => {
                void authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = "/admin/login";
                    },
                  },
                });
              }}
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="منوی مدیریت" className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-[var(--radius-lg)] px-3 py-2 text-sm transition hover:bg-surface"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
