import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { categoryUpdateSchema } from "@/lib/validation";
import {
  deleteCategory,
  getCategoryById,
  updateCategory,
} from "@/server/category.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) {
    return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: category });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await updateCategory(id, parsed.data);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: "A category with this slug already exists." },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, data: result.category });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const result = await deleteCategory(id);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
    }
    return NextResponse.json(
      {
        success: false,
        error: "Cannot delete a category that still has products. Reassign or remove them first.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, data: null });
}
