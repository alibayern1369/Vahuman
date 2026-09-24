"use client";

import { authClient } from "@/lib/auth/client";

export function AccountSignOutButton() {
  return (
    <button
      type="button"
      className="rounded-[var(--radius-lg)] border border-border px-3 py-1.5 text-sm hover:bg-background"
      onClick={() => {
        void authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = "/";
            },
          },
        });
      }}
    >
      خروج
    </button>
  );
}
