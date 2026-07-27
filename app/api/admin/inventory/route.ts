import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { inventoryListQuerySchema } from "@/lib/validation";
import { listInventory } from "@/server/inventory.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const parsed = inventoryListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { search, category, brand, status, page, pageSize } = parsed.data;
  const { items, total } = await listInventory({
    search,
    categoryId: category,
    brandId: brand,
    status,
    page,
    pageSize,
  });

  return NextResponse.json({ success: true, data: { items, total, page, pageSize } });
}
