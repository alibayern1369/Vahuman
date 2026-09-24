import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold">صفحه پیدا نشد</h1>
      <p className="mt-3 text-muted">
        محصول، دسته یا صفحه‌ای که دنبالش هستید در دسترس نیست.
      </p>
      <Link
        href="/shop"
        className="mt-6 rounded-[var(--radius-lg)] bg-accent px-5 py-3 text-sm text-accent-foreground"
      >
        بازگشت به فروشگاه
      </Link>
    </div>
  );
}
