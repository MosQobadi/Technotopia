import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { customerStatusSchema } from "@/lib/validation";
import { updateCustomerStatus } from "@/server/customer.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = customerStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await updateCustomerStatus(id, parsed.data.status);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Customer not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.customer });
}
