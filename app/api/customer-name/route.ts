import { NextRequest, NextResponse } from "next/server";
import { setCustomerName, getCustomerNames } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { address, name } = await request.json();

  if (!address || !name) {
    return NextResponse.json({ error: "address and name are required" }, { status: 400 });
  }

  setCustomerName(address, name);
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const addressesParam = request.nextUrl.searchParams.get("addresses");
  if (!addressesParam) {
    return NextResponse.json({ error: "addresses query param is required" }, { status: 400 });
  }

  const addresses = addressesParam.split(",").filter(Boolean);
  const names = getCustomerNames(addresses);
  return NextResponse.json({ names });
}