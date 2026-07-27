import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { orderListQuerySchema } from "@/lib/validation";
import { listOrders } from "@/server/order.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const parsed = orderListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { search, status, payment, dateFrom, dateTo, page, pageSize } = parsed.data;
  const { orders, total } = await listOrders({
    search,
    status,
    paymentStatus: payment,
    dateFrom,
    dateTo,
    page,
    pageSize,
  });

  return NextResponse.json({ success: true, data: { orders, total, page, pageSize } });
}
