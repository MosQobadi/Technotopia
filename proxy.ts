import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, getCookieName } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(getCookieName())?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload || payload.role !== Role.ADMIN) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
