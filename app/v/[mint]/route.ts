import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

// This is the page a voucher NFT's metadata link points at. The voucher's
// name and symbol are stored inside the NFT itself on-chain, so they're left
// out here on purpose — one source for each fact. What this adds is the
// description a wallet or explorer can show, and a link back to the app.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;

  try {
    new PublicKey(mint);
  } catch {
    return NextResponse.json({ error: "That isn't a valid address." }, { status: 404 });
  }

  return NextResponse.json({
    description:
      "A loyalty reward voucher from Passdari. Whoever holds this token can redeem it once, at the business that issued it. It is burned when it's used.",
    external_url: new URL("/", request.url).origin,
    attributes: [{ trait_type: "Voucher token", value: mint }],
  });
}
