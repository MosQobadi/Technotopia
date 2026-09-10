import { NextResponse, type NextRequest } from "next/server";
import { getCustomerId, requireUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createOrderSchema } from "@/lib/validation";
import { createOrder, getOrderHistoryForCustomer } from "@/server/order.service";

// Checkout is open to guests, which makes it the one storefront write anyone can
// reach without an account — and it moves stock. Ten orders an hour per address
// stops a script draining the shelves into pending orders without rationing a
// household or an office that shares one IP.
const ORDER_RATE_LIMIT_MAX_ATTEMPTS = 10;
const ORDER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const orders = await getOrderHistoryForCustomer(auth.payload.userId);
  return NextResponse.json({ success: true, data: orders });
}

export async function POST(request: NextRequest) {
  // First, before the body is read or the database is asked anything: a refused
  // request should cost the server as close to nothing as it can.
  const rateLimit = checkRateLimit(
    `storefront-order:${getClientIp(request)}`,
    ORDER_RATE_LIMIT_MAX_ATTEMPTS,
    ORDER_RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many orders. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // Who is ordering comes from the verified session and nothing else. The schema
  // has no customer field, so an id in the body was stripped before this line;
  // no session, or a staff one, orders as a guest.
  const customerId = await getCustomerId(request);

  const result = await createOrder(customerId, parsed.data);
  if (!result.ok) {
    if (result.reason === "empty_cart") {
      return NextResponse.json({ success: false, error: "Your cart is empty." }, { status: 400 });
    }

    if (result.reason === "unavailable_items") {
      const names = result.items.map((item) => item.name ?? item.productId).join(", ");
      return NextResponse.json(
        { success: false, error: `No longer available: ${names}` },
        { status: 409 },
      );
    }

    const details = result.items
      .map((item) => `${item.name} (${item.available} available, ${item.requested} requested)`)
      .join(", ");
    return NextResponse.json(
      { success: false, error: `Insufficient stock: ${details}` },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, data: result.order }, { status: 201 });
}
