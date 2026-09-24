/**
 * Shared AppError type for consistent server-side error handling.
 * Map to HTTP responses in route handlers; never leak internals to clients.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly expose: boolean;

  constructor(
    message: string,
    options: { code: string; status?: number; expose?: boolean } = {
      code: "INTERNAL_ERROR",
    },
  ) {
    super(message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status ?? 500;
    this.expose = options.expose ?? false;
  }
}

export function toPublicErrorMessage(error: unknown): string {
  if (error instanceof AppError && error.expose) {
    return error.message;
  }
  return "خطای داخلی سرور. لطفاً دوباره تلاش کنید.";
}
