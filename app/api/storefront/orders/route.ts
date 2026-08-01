import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { createOrderSchema } from "@/lib/validation";
import { createOrder } from "@/server/order.service";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await createOrder(auth.payload.userId, parsed.data);
  if (!result.ok) {
    if (result.reason === "empty_cart") {
      return NextResponse.json(
        { success: false, error: "Your cart is empty." },
        { status: 400 },
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

  return NextResponse.json({ success: true, data: { orderId: result.orderId } }, { status: 201 });
}
