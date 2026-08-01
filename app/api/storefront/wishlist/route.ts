import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { wishlistAddItemSchema } from "@/lib/validation";
import { addWishlistItem, getWishlist } from "@/server/wishlist.service";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const items = await getWishlist(auth.payload.userId);
  return NextResponse.json({ success: true, data: items });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = wishlistAddItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await addWishlistItem(auth.payload.userId, parsed.data.productId);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.items }, { status: 201 });
}
