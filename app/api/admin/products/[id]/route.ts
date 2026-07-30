import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { productUpdateSchema } from "@/lib/validation";
import {
  deleteProduct,
  getProductById,
  updateProduct,
} from "@/server/product.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: product });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await updateProduct(id, parsed.data);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
    }
    const error =
      result.reason === "duplicate_slug"
        ? "A product with this name already exists."
        : "A product with this SKU already exists.";
    return NextResponse.json({ success: false, error }, { status: 409 });
  }

  return NextResponse.json({ success: true, data: result.product });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const result = await deleteProduct(id);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  if (result.deactivated) {
    return NextResponse.json({
      success: true,
      data: { deactivated: true, product: result.product },
    });
  }

  return NextResponse.json({ success: true, data: { deactivated: false, product: null } });
}
