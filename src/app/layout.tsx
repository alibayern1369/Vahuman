import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";

import { appConfig } from "@/config/app";

import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${appConfig.name} | زیر توسعه`,
    template: `%s | ${appConfig.name}`,
  },
  description:
    "پایه فنی فروشگاه اینترنتی سفارشی فارسی — فاز صفر توسعه.",
  applicationName: appConfig.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
