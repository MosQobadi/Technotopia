import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { bannerReorderSchema } from "@/lib/validation";
import { reorderBanners } from "@/server/banner.service";

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = bannerReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await reorderBanners(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: "One or more banners were not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: null });
}
