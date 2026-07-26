import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation";
import { signToken, setAuthCookie, type CookieStore } from "@/lib/auth";
import { authenticateAdmin } from "@/server/auth.service";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await authenticateAdmin(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    if (result.reason === "not_admin") {
      return NextResponse.json(
        { success: false, error: "Only administrator accounts can access the admin panel." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const token = await signToken({ userId: result.user.id, role: result.user.role });
  const response = NextResponse.json({ success: true, data: result.user });

  const cookieStore: CookieStore = {
    set: (name, value, options) => response.cookies.set(name, value, options),
  };
  setAuthCookie(cookieStore, token);

  return response;
}
