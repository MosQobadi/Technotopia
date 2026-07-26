import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { categoryCreateSchema, categoryListQuerySchema } from "@/lib/validation";
import { createCategory, listCategories } from "@/server/category.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const parsed = categoryListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { search, status, page, pageSize } = parsed.data;
  const { categories, total } = await listCategories({ search, status, page, pageSize });

  return NextResponse.json({ success: true, data: { categories, total, page, pageSize } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await createCategory(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: "A category with this slug already exists." },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, data: result.category }, { status: 201 });
}
