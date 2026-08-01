import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { cartAddItemSchema } from "@/lib/validation";
import { addCartItem, getCart } from "@/server/cart.service";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const cart = await getCart(auth.payload.userId);
  return NextResponse.json({ success: true, data: cart });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = cartAddItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await addCartItem(auth.payload.userId, parsed.data.productId, parsed.data.quantity);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.cart }, { status: 201 });
}
