import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { slugSchema, stockNotificationCreateSchema } from "@/lib/validation";
import { requestRestockNotification } from "@/server/stock-notification.service";

// Public and unauthenticated, and it writes a row the admin has to read by hand
// — so it is limited per address before anything touches the database. Ten an
// hour covers a household trying a few products without letting a script fill
// the admin's waiting list.
const NOTIFY_RATE_LIMIT_MAX_ATTEMPTS = 10;
const NOTIFY_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const rateLimit = checkRateLimit(
    `storefront-notify-me:${getClientIp(request)}`,
    NOTIFY_RATE_LIMIT_MAX_ATTEMPTS,
    NOTIFY_RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = stockNotificationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await requestRestockNotification(slug, parsed.data.contact);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  // 201 when a request now exists; 200 when there was nothing to wait for.
  return NextResponse.json(
    { success: true, data: { alreadyInStock: result.alreadyInStock } },
    { status: result.alreadyInStock ? 200 : 201 },
  );
}
