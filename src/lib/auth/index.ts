import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { appConfig } from "@/config/app";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

function requireAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET (min 32 chars) is required. Add it to .env.local.",
    );
  }
  return secret;
}

function appBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

export const auth = betterAuth({
  appName: appConfig.nameLatin,
  baseURL: appBaseUrl(),
  secret: requireAuthSecret(),
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Customer self-registration enabled by default (Phase 5).
    // Set AUTH_DISABLE_SIGNUP=true to lock public registration.
    disableSignUp: process.env.AUTH_DISABLE_SIGNUP === "true",
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
