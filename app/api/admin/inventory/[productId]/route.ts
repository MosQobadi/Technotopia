import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
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

  // A restock is when the people on this product's back-in-stock list get told
  // to come and look, so its cached page must not go on saying "out of stock".
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/products/${result.slug}`);
  }

  return NextResponse.json({ success: true, data: result.item });
}
