import { appConfig } from "@/config/app";
import { formatDate, formatNumber, formatToman } from "@/lib/utils/format";

export default function HomePage() {
  const sampleDate = formatDate(new Date());
  const samplePrice = formatToman(1_250_000);
  const sampleCount = formatNumber(42);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-8">
      <p className="mb-3 text-sm font-medium tracking-wide text-muted">
        فاز صفر · پایه فنی
      </p>

      <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        {appConfig.name}
      </h1>

      <p className="mb-2 text-base font-medium tracking-[0.2em] text-foreground/80">
        {appConfig.nameLatin}
      </p>

      <p className="mb-10 max-w-2xl text-lg leading-8 text-muted">
        این صفحه فقط بنیاد توسعهٔ فروشگاه «{appConfig.name}» را نشان می‌دهد:
        Next.js، تایپ‌اسکریپت، Tailwind، پشتیبانی کامل فارسی و راست‌چین. فروشگاه و{" "}
        {appConfig.adminTitle} هنوز پیاده‌سازی نشده‌اند.
      </p>

      <section
        aria-label="نمونه قالب‌بندی محلی"
        className="grid gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6 sm:grid-cols-3"
      >
        <div>
          <p className="mb-1 text-sm text-muted">تاریخ نمونه</p>
          <p className="text-base font-medium">{sampleDate}</p>
        </div>
        <div>
          <p className="mb-1 text-sm text-muted">قیمت نمونه</p>
          <p className="text-base font-medium">{samplePrice}</p>
        </div>
        <div>
          <p className="mb-1 text-sm text-muted">عدد نمونه</p>
          <p className="text-base font-medium">{sampleCount}</p>
        </div>
      </section>

      <p className="mt-10 text-sm leading-7 text-muted">
        جهت صفحه:{" "}
        <span className="font-medium text-foreground">{appConfig.direction.toUpperCase()}</span>
        {" · "}
        زبان:{" "}
        <span className="font-medium text-foreground">{appConfig.locale}</span>
        {" · "}
        Mixed text: OK / تأیید
      </p>

      <p className="mt-6 text-sm">
        <a
          href="/admin/login"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          ورود به {appConfig.adminTitle}
        </a>
      </p>
    </main>
  );
}
