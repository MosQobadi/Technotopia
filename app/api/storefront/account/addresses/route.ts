import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { addressCreateSchema } from "@/lib/validation";
import { createAddress, getAddresses } from "@/server/account.service";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const addresses = await getAddresses(auth.payload.userId);
  return NextResponse.json({ success: true, data: addresses });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = addressCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const address = await createAddress(auth.payload.userId, parsed.data);
  return NextResponse.json({ success: true, data: address }, { status: 201 });
}
