import { NextResponse } from "next/server";
import { clearAuthCookie, type CookieStore } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true, data: null });

  const cookieStore: CookieStore = {
    set: (name, value, options) => response.cookies.set(name, value, options),
  };
  clearAuthCookie(cookieStore);

  return response;
}
