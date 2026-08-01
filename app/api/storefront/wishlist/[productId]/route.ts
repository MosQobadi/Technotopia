import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { removeWishlistItem } from "@/server/wishlist.service";

interface RouteContext {
  params: Promise<{ productId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { productId } = await params;
  const result = await removeWishlistItem(auth.payload.userId, productId);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Wishlist item not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.items });
}
