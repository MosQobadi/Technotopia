import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, getCookieName } from "@/lib/auth";
import { getUserById } from "@/server/auth.service";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getCookieName())?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: user });
}
