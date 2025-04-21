// middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("auth-token")?.value;

  // Izinkan akses ke halaman login
  if (request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Jika tidak ada token atau token salah → redirect ke login
  if (token !== "admin_uid_12345") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/page/:path*"],
};
