import { NextRequest, NextResponse } from "next/server";

import { expireUnpaidReservations } from "@/lib/orders/expire";

/**
 * Portable cron endpoint for reservation expiration.
 * Protect with CRON_SECRET header: Authorization: Bearer <secret>
 * Or x-cron-secret: <secret>
 *
 * Example (any scheduler):
 *   curl -X POST "$APP_URL/api/cron/expire-reservations" \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await expireUnpaidReservations();
  return NextResponse.json({ ok: true, ...result });
}
