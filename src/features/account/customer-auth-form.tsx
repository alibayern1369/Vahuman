"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { syncCustomerSessionAction } from "@/features/account/actions";
import { authClient } from "@/lib/auth/client";

type Props = {
  nextPath: string;
  mode: "login" | "register";
};

export function CustomerAuthForm({ nextPath, mode }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    if (mode === "register") {
      const result = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim() || "مشتری وهومن",
      });
      if (result.error) {
        setError(result.error.message || "ثبت‌نام ناموفق بود.");
        setPending(false);
        return;
      }
    } else {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (result.error) {
        setError(result.error.message || "ورود ناموفق بود.");
        setPending(false);
        return;
      }
    }

    await syncCustomerSessionAction();
    router.replace(nextPath || "/account");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5">
      {mode === "register" ? (
        <div>
          <label htmlFor="name" className="mb-2 block text-sm text-muted">
            نام
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="mb-2 block text-sm text-muted">
          ایمیل
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          dir="ltr"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm text-muted">
          رمز عبور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          dir="ltr"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[var(--radius-lg)] bg-accent px-4 py-3 text-base font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending
          ? "لطفاً صبر کنید…"
          : mode === "register"
            ? "ایجاد حساب"
            : "ورود"}
      </button>

      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            حساب ندارید؟{" "}
            <Link href="/account/register" className="text-accent hover:underline">
              ثبت‌نام
            </Link>
          </>
        ) : (
          <>
            قبلاً ثبت‌نام کرده‌اید؟{" "}
            <Link href="/account/login" className="text-accent hover:underline">
              ورود
            </Link>
          </>
        )}
      </p>
      <p className="text-center text-xs text-muted">
        خرید بدون حساب همچنان از طریق تسویه‌حساب مهمان ممکن است.
      </p>
    </form>
  );
}
