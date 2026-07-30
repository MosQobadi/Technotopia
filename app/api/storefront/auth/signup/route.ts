import { NextResponse, type NextRequest } from "next/server";
import { signupSchema } from "@/lib/validation";
import { signToken, setAuthCookie, type CookieStore } from "@/lib/auth";
import { registerCustomer } from "@/server/auth.service";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await registerCustomer(parsed.data);

  if (!result.ok) {
    const error =
      result.reason === "email_taken"
        ? "An account with this email already exists."
        : "An account with this phone number already exists.";
    return NextResponse.json({ success: false, error }, { status: 409 });
  }

  const token = await signToken({ userId: result.user.id, role: result.user.role });
  const response = NextResponse.json({ success: true, data: result.user });

  const cookieStore: CookieStore = {
    set: (name, value, options) => response.cookies.set(name, value, options),
  };
  setAuthCookie(cookieStore, token);

  return response;
}
