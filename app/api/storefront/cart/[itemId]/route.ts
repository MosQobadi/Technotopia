import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { cartUpdateItemSchema } from "@/lib/validation";
import { removeCartItem, updateCartItemQuantity } from "@/server/cart.service";

interface RouteContext {
  params: Promise<{ itemId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = cartUpdateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { itemId } = await params;
  const result = await updateCartItemQuantity(auth.payload.userId, itemId, parsed.data.quantity);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Cart item not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.cart });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { itemId } = await params;
  const result = await removeCartItem(auth.payload.userId, itemId);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Cart item not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.cart });
}
