import { NextResponse } from "next/server";

// What a stamp card NFT's metadata link points at. One page for every card, not one per card.
//
// It used to be /c/<mint>, which made the link 78 bytes — and that link is stored inside the mint
// account, where every byte is paid for in rent on every card ever made. The only thing the per-card
// page added was the mint address, which a wallet reading the metadata already has. Dropping it saves
// 45 bytes a card and costs nothing anyone can see.
//
// The name and symbol are on-chain in the token itself and are deliberately not repeated here. The stamp
// count is not here either: it changes with every stamp and lives on the card account, not in the token.
// The picture is a plain file served from this app, so it costs nothing on-chain.
//
// /c/[mint] is kept alongside this, because cards minted before the change still point at it.
export function GET(request: Request) {
  const origin = new URL("/", request.url).origin;
  const image = `${origin}/nft/passdari-card.png`;

  return NextResponse.json({
    name: "Passdari stamp card",
    description:
      "A loyalty stamp card from Passdari. It can't be sent to another wallet, and it is burned when its stamps are spent on a reward.",
    image,
    properties: { files: [{ uri: image, type: "image/png" }], category: "image" },
    external_url: origin,
  });
}
