import { appConfig } from "@/config/app";

/**
 * Central locale helpers for Persian UI.
 * Prefer these over ad-hoc `toLocaleString` calls across the app.
 */

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(appConfig.locale).format(value);
}

/** Formats a price already expressed in Iranian tomans. */
export function formatToman(amountToman: number): string {
  return `${formatNumber(amountToman)} تومان`;
}

export function formatDate(date: Date | string | number): string {
  const value = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(appConfig.locale, {
    dateStyle: "medium",
    timeZone: appConfig.timezone,
  }).format(value);
}

export function formatDateTime(date: Date | string | number): string {
  const value = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(appConfig.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: appConfig.timezone,
  }).format(value);
}
