import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

// This is the page a stamp card NFT's metadata link points at. The card's name and symbol are stored inside
// the NFT itself on-chain, so they're left out here on purpose: one source for each fact. The stamp count is
// left out too, because it changes with every stamp and lives on the card account, not in the token.
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
      "A loyalty stamp card from Passdari. It can't be sent to another wallet, and it is burned when its stamps are spent on a reward.",
    external_url: new URL("/", request.url).origin,
    attributes: [{ trait_type: "Card token", value: mint }],
  });
}
