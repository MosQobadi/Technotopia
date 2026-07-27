import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { inventoryUpdateSchema } from "@/lib/validation";
import { addStock } from "@/server/inventory.service";

interface RouteContext {
  params: Promise<{ productId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = inventoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { productId } = await params;
  const result = await addStock(productId, parsed.data.addStock);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.item });
}
