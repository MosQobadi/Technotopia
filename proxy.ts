import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { verifyToken, getCookieName } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

async function adminGuard(request: NextRequest) {
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

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return adminGuard(request);
  }

  // Everything else (storefront + dev-preview routes): next-intl's own
  // locale routing ("as-needed" — "/" stays English, "/fa" is Farsi). The
  // resolved locale reaches app/[locale]/layout.tsx via the route param
  // next-intl rewrites onto the request, so no header-passing is needed here.
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/admin/:path*", "/((?!api|_next|.*\\..*).*)"],
};
