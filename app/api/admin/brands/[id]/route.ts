import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { brandUpdateSchema } from "@/lib/validation";
import { deleteBrand, getBrandById, updateBrand } from "@/server/brand.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand) {
    return NextResponse.json({ success: false, error: "Brand not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: brand });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = brandUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await updateBrand(id, parsed.data);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ success: false, error: "Brand not found." }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: "A brand with this slug already exists." },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, data: result.brand });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const result = await deleteBrand(id);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ success: false, error: "Brand not found." }, { status: 404 });
    }
    return NextResponse.json(
      {
        success: false,
        error: "Cannot delete a brand that still has products. Reassign or remove them first.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, data: null });
}
