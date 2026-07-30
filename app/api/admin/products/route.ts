import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { productCreateSchema, productListQuerySchema } from "@/lib/validation";
import { createProduct, listProducts } from "@/server/product.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const parsed = productListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { search, category, brand, status, page, pageSize } = parsed.data;
  const { products, total } = await listProducts({
    search,
    categoryId: category,
    brandId: brand,
    status,
    page,
    pageSize,
  });

  return NextResponse.json({ success: true, data: { products, total, page, pageSize } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await createProduct(parsed.data);
  if (!result.ok) {
    const error =
      result.reason === "duplicate_slug"
        ? "A product with this name already exists."
        : "A product with this SKU already exists.";
    return NextResponse.json({ success: false, error }, { status: 409 });
  }

  return NextResponse.json({ success: true, data: result.product }, { status: 201 });
}
