"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

type AdminLoginFormProps = {
  nextPath: string;
  initialError?: string;
};

export function AdminLoginForm({
  nextPath,
  initialError,
}: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const result = await authClient.signIn.email({
      email: email.trim(),
      password,
    });

    if (result.error) {
      setError(result.error.message || "ورود ناموفق بود.");
      setPending(false);
      return;
    }

    router.replace(nextPath || "/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5">
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
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 text-base text-foreground outline-none focus:border-accent"
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[var(--radius-lg)] bg-accent px-4 py-3 text-base font-medium text-accent-foreground transition disabled:opacity-60"
      >
        {pending ? "در حال ورود…" : "ورود به پنل"}
      </button>
    </form>
  );
}
