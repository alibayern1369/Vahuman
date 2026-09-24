/**
 * Application configuration constants.
 * Keep secrets out of this file — use environment variables via `src/config/env.ts`.
 */
export const appConfig = {
  name: "Honey",
  locale: "fa-IR",
  direction: "rtl" as const,
  currency: {
    code: "IRR",
    /** Display unit for storefront pricing (Iranian toman). */
    displayUnit: "toman" as const,
    locale: "fa-IR",
  },
  timezone: "Asia/Tehran",
} as const;
