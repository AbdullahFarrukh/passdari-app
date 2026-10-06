import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { setCustomerName, getCustomerNames } from "@/lib/db";
import { verifyDisplayName } from "@/lib/nameAuth";
import { isRateLimited } from "@/lib/rateLimit";
import { rejectCrossSite } from "@/lib/sameOrigin";

const MAX_NAME_LENGTH = 50;
const MAX_ADDRESSES_PER_LOOKUP = 100;

function isValidSolanaAddress(address: unknown): address is string {
  if (typeof address !== "string") return false;
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited("customer-name-write", ip, { max: 20, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests — please slow down." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const address = body?.address;
  const name = body?.name;

  if (!isValidSolanaAddress(address)) {
    return NextResponse.json({ error: "address must be a valid Solana public key" }, { status: 400 });
  }
  if (typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length === 0 || trimmedName.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be between 1 and ${MAX_NAME_LENGTH} characters` },
      { status: 400 }
    );
  }

  // A wallet's address is public, so anyone could otherwise set anyone's name.
  // Only the wallet's owner can sign for it. This checks the name exactly as
  // the browser sent (and signed) it, before trimming.
  const auth = verifyDisplayName({
    address,
    name,
    timestamp: body?.timestamp,
    signature: body?.signature,
  });
  if (!auth.ok) {
    return NextResponse.json(
      {
        error:
          auth.reason === "expired"
            ? "This request has expired. Please try again, and check that your device's clock is correct."
            : "We couldn't confirm this name change came from the wallet's owner.",
      },
      { status: 401 }
    );
  }

  const saved = await setCustomerName(address, trimmedName);
  if (!saved) {
    return NextResponse.json({ error: "Display names are temporarily unavailable." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited("customer-name-read", ip, { max: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests — please slow down." }, { status: 429 });
  }

  const addressesParam = request.nextUrl.searchParams.get("addresses");
  if (!addressesParam) {
    return NextResponse.json({ error: "addresses query param is required" }, { status: 400 });
  }

  const addresses = addressesParam
    .split(",")
    .filter(Boolean)
    .filter(isValidSolanaAddress)
    .slice(0, MAX_ADDRESSES_PER_LOOKUP);

  const names = await getCustomerNames(addresses);
  return NextResponse.json({ names });
}