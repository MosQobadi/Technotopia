import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { brandCreateSchema, brandListQuerySchema } from "@/lib/validation";
import { createBrand, listBrands } from "@/server/brand.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const parsed = brandListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { search, status, page, pageSize } = parsed.data;
  const { brands, total } = await listBrands({ search, status, page, pageSize });

  return NextResponse.json({ success: true, data: { brands, total, page, pageSize } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = brandCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await createBrand(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: "A brand with this slug already exists." },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, data: result.brand }, { status: 201 });
}
