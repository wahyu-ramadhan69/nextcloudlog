import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("auth-token")?.value;

  // Izinkan akses ke halaman login
  if (request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Token valid untuk user admin atau audit
  const allowedTokens = ["admin_uid_12345", "audit_uid_12345"];

  if (!allowedTokens.includes(token)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/page/:path*"],
};
