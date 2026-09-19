import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { setCustomerName, getCustomerNames } from "@/lib/db";

const MAX_NAME_LENGTH = 50;
const MAX_ADDRESSES_PER_LOOKUP = 100;

// Simple per-IP rate limit — same reasoning as the relay endpoint: this
// stops naive spam/scripted abuse, not a determined attacker rotating
// IPs. Kept separate from the relay endpoint's limiter since they guard
// unrelated things.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
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

  setCustomerName(address, trimmedName);
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const addressesParam = request.nextUrl.searchParams.get("addresses");
  if (!addressesParam) {
    return NextResponse.json({ error: "addresses query param is required" }, { status: 400 });
  }

  const addresses = addressesParam
    .split(",")
    .filter(Boolean)
    .filter(isValidSolanaAddress)
    .slice(0, MAX_ADDRESSES_PER_LOOKUP);

  const names = getCustomerNames(addresses);
  return NextResponse.json({ names });
}