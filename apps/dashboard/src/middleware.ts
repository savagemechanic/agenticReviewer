import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const dashboardSecret = process.env.DASHBOARD_SECRET;

  // If no secret configured, skip auth
  if (!dashboardSecret) return NextResponse.next();

  // Allow login page and auth API
  if (
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get("dashboard_auth")?.value;
  if (authCookie !== dashboardSecret) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
