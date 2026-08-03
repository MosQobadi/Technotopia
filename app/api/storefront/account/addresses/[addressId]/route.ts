import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { addressUpdateSchema } from "@/lib/validation";
import { deleteAddress, updateAddress } from "@/server/account.service";

interface RouteContext {
  params: Promise<{ addressId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = addressUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { addressId } = await params;
  const result = await updateAddress(auth.payload.userId, addressId, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Address not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.address });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { addressId } = await params;
  const result = await deleteAddress(auth.payload.userId, addressId);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: "Address not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: null });
}
