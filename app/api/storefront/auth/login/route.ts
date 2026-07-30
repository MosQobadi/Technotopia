import { NextResponse, type NextRequest } from "next/server";
import { storefrontLoginSchema } from "@/lib/validation";
import { signToken, setAuthCookie, type CookieStore } from "@/lib/auth";
import { authenticateUser } from "@/server/auth.service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `storefront-login:${ip}`,
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    LOGIN_RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = storefrontLoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await authenticateUser(parsed.data.identifier, parsed.data.password);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: "Invalid email/phone or password." },
      { status: 401 },
    );
  }

  const token = await signToken({ userId: result.user.id, role: result.user.role });
  const response = NextResponse.json({ success: true, data: result.user });

  const cookieStore: CookieStore = {
    set: (name, value, options) => response.cookies.set(name, value, options),
  };
  setAuthCookie(cookieStore, token);

  return response;
}
