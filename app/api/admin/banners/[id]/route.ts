import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { bannerUpdateSchema } from "@/lib/validation";
import { deleteBanner, getBannerById, updateBanner } from "@/server/banner.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const banner = await getBannerById(id);
  if (!banner) {
    return NextResponse.json({ success: false, error: "Banner not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: banner });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = bannerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await updateBanner(id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Banner not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.banner });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const result = await deleteBanner(id);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Banner not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: null });
}
