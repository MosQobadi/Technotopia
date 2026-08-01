import { NextResponse } from "next/server";
import { getHomeData } from "@/server/home.service";

export async function GET() {
  const data = await getHomeData();
  return NextResponse.json({ success: true, data });
}
