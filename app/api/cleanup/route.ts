import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { findStaleRent, runCleanup } from "@/lib/cleanup";
import { isRateLimited } from "@/lib/rateLimit";

// Sweeps up rent nobody is coming back for: expired, unclaimed receipts; vouchers nobody redeemed within
// 90 days; and card NFTs nobody has stamped in 90 days. See lib/cleanup.ts for why none of this needs the
// business owner's or the customer's signature — only the relayer's, which this route holds.
//
//   GET  ?business=<pubkey>         count only, for a merchant's own dashboard — safe to call anytime
//   GET  (no business), with the    the daily sweep across every business — see vercel.json's cron entry
//        cron secret header
//   POST { "business": "<pubkey>" } actually closes a business's stale accounts — the "Clean up" button

const connection = new Connection(process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
const relayerSecretKey = JSON.parse(process.env.RELAYER_SECRET_KEY!);
const relayer = Keypair.fromSecretKey(new Uint8Array(relayerSecretKey));

// Closing someone else's stale account only ever sends that account's rent back to whoever already owns
// it, so the limit only has to keep this from being used to burn the relayer's transaction fees.

function parseBusiness(value: string | null): PublicKey | undefined {
  if (!value) return undefined;
  try {
    return new PublicKey(value);
  } catch {
    throw new Error("That doesn't look like a business address.");
  }
}

export async function GET(request: NextRequest) {
  const businessParam = request.nextUrl.searchParams.get("business");

  if (!businessParam) {
    // The unattended daily sweep, across every business. Vercel sets this header on the request it makes
    // to run the cron job, from the CRON_SECRET environment variable — see vercel.json and the README.
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return NextResponse.json({ error: "CRON_SECRET is not configured — refusing a global sweep." }, { status: 503 });
    }
    if (request.headers.get("authorization") !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const summary = await runCleanup(connection, relayer, {});
    return NextResponse.json(summary);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited("cleanup", ip, { max: 15, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests — please slow down." }, { status: 429 });
  }

  try {
    const business = parseBusiness(businessParam)!;
    const { staleReceipts, staleVouchers, idleCards } = await findStaleRent(connection, { business });
    return NextResponse.json({
      receipts: { found: staleReceipts.length },
      vouchers: { found: staleVouchers.length },
      cardNfts: { found: idleCards.length },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited("cleanup", ip, { max: 15, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests — please slow down." }, { status: 429 });
  }

  let business: PublicKey;
  try {
    const body = await request.json();
    const parsed = parseBusiness(typeof body?.business === "string" ? body.business : null);
    if (!parsed) {
      return NextResponse.json({ error: "Missing business address" }, { status: 400 });
    }
    business = parsed;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Malformed request" }, { status: 400 });
  }

  try {
    const summary = await runCleanup(connection, relayer, { business });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 500 });
  }
}
