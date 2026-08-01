import { NextResponse, type NextRequest } from "next/server";
import { storefrontSearchQuerySchema } from "@/lib/validation";
import { searchStorefront } from "@/server/search.service";

export async function GET(request: NextRequest) {
  const parsed = storefrontSearchQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const data = await searchStorefront(parsed.data);
  return NextResponse.json({ success: true, data });
}
