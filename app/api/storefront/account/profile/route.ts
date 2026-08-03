import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validation";
import { getProfile, updateProfile } from "@/server/account.service";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const profile = await getProfile(auth.payload.userId);
  if (!profile) {
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: profile });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await updateProfile(auth.payload.userId, parsed.data);
  if (!result.ok) {
    const error = result.reason === "email_taken" ? "Email is already in use." : "Phone number is already in use.";
    return NextResponse.json({ success: false, error }, { status: 409 });
  }

  return NextResponse.json({ success: true, data: result.user });
}
