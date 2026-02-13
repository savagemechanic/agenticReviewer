import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  const dashboardSecret = process.env.DASHBOARD_SECRET;

  // If no secret configured, allow all access
  if (!dashboardSecret) {
    const res = NextResponse.json({ success: true });
    res.cookies.set("dashboard_auth", "open", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return res;
  }

  if (secret !== dashboardSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("dashboard_auth", dashboardSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}
