"use client";

import { useState, useTransition } from "react";

type Props = {
  action: () => Promise<{ ok: boolean; error?: string; message?: string }>;
  children: React.ReactNode;
  className?: string;
  onSuccess?: () => void;
};

export function ActionForm({ action, children, className, onSuccess }: Props) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        startTransition(async () => {
          const result = await action();
          if (!result.ok) {
            setError(result.error || "خطا");
            return;
          }
          setMessage(result.message || "انجام شد.");
          onSuccess?.();
        });
      }}
    >
      {children}
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      {pending ? (
        <p className="mt-2 text-sm text-muted">در حال ذخیره…</p>
      ) : null}
    </form>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClassName =
  "w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export const buttonClassName =
  "rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60";

export const secondaryButtonClassName =
  "rounded-[var(--radius-lg)] border border-border px-3 py-2 text-sm";
