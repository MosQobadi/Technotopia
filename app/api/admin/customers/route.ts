import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { customerListQuerySchema } from "@/lib/validation";
import { listCustomers } from "@/server/customer.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const parsed = customerListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { search, status, page, pageSize } = parsed.data;
  const { customers, total } = await listCustomers({ search, status, page, pageSize });

  return NextResponse.json({ success: true, data: { customers, total, page, pageSize } });
}
