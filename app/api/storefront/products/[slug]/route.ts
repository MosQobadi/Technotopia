import { NextResponse, type NextRequest } from "next/server";
import { getStorefrontProductBySlug } from "@/server/storefront-product.service";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const result = await getStorefrontProductBySlug(slug);

  if (!result) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result });
}