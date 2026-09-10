import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { stockNotificationMarkSchema } from "@/lib/validation";
import {
  listPendingStockNotifications,
  markStockNotificationsNotified,
} from "@/server/stock-notification.service";

// The back-in-stock requests waiting on one product, read and cleared from the
// Inventory stock modal. There is no sender: the admin reaches each contact by
// hand, then marks the ones they were shown.

interface RouteContext {
  params: Promise<{ productId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { productId } = await params;
  const notifications = await listPendingStockNotifications(productId);
  return NextResponse.json({ success: true, data: notifications });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = stockNotificationMarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { productId } = await params;
  const count = await markStockNotificationsNotified(productId, parsed.data.ids);
  return NextResponse.json({ success: true, data: { count } });
}
