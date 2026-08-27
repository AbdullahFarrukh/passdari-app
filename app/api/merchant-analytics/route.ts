import { NextRequest, NextResponse } from "next/server";
import { getBusinessAnalytics } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const ownerParam = request.nextUrl.searchParams.get("owner");
  if (!ownerParam) {
    return NextResponse.json({ error: "owner query param is required" }, { status: 400 });
  }

  try {
    const data = await getBusinessAnalytics(ownerParam);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong" },
      { status: 500 }
    );
  }
}