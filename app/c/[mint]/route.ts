import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

// This is the page a stamp card NFT's metadata link points at. The card's name and symbol are stored inside
// the NFT itself on-chain, so they're left out here on purpose: one source for each fact. The stamp count is
// left out too, because it changes with every stamp and lives on the card account, not in the token. The
// picture is a plain file served from this app (public/nft), so it costs nothing on-chain.
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

  const origin = new URL("/", request.url).origin;
  const image = `${origin}/nft/passdari-card.png`;

  return NextResponse.json({
    description:
      "A loyalty stamp card from Passdari. It can't be sent to another wallet, and it is burned when its stamps are spent on a reward.",
    image,
    properties: { files: [{ uri: image, type: "image/png" }], category: "image" },
    external_url: origin,
    attributes: [{ trait_type: "Card token", value: mint }],
  });
}
