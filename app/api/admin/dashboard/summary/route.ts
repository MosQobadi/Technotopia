import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { paginationQuerySchema } from "@/lib/validation";
import { getDashboardSummary } from "@/server/dashboard.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const parsed = paginationQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { page, pageSize } = parsed.data;
  const summary = await getDashboardSummary({ page, pageSize });

  return NextResponse.json({ success: true, data: summary });
}
