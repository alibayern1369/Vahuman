import { NextRequest, NextResponse } from "next/server";

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get("better-auth.session_token")?.value ||
      request.cookies.get("__Secure-better-auth.session_token")?.value,
  );
}

/**
 * Lightweight cookie gates:
 * - /admin → admin login (role checked in layout)
 * - /account (except login/register) → customer login
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && !hasSessionCookie(request)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAccountPublic =
    pathname === "/account/login" || pathname === "/account/register";

  if (
    pathname.startsWith("/account") &&
    !isAccountPublic &&
    !hasSessionCookie(request)
  ) {
    const loginUrl = new URL("/account/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/account", "/account/:path*"],
};
