/**
 * Application configuration constants.
 * Keep secrets out of this file — use environment variables via `src/config/env.ts`.
 */
export const appConfig = {
  /** Persian brand name shown in the UI */
  name: "وهومن",
  /** Latin brand mark */
  nameLatin: "VAHUMAN",
  /** Technical / package / repo slug */
  slug: "vahuman",
  adminTitle: "مدیریت وهومن",
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
