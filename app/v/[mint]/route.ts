import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@anchor-lang/core";
import idl from "@/lib/loyalty.json";
import { PROGRAM_ID } from "@/lib/explorer";
import { VOUCHER_MINT_OFFSET } from "@/lib/vouchers";

// This is the page a voucher NFT's metadata link points at. The voucher's
// name and symbol are stored inside the NFT itself on-chain, so they're left
// out here on purpose — one source for each fact. What this adds is the
// description and the picture a wallet or explorer can show, and a link back
// to the app. The picture is a plain file served from this app (public/nft),
// so it costs nothing on-chain; only the link to this page is stored there.
const connection = new Connection(process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
const coder = new BorshCoder(idl as any);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;

  let mintKey: PublicKey;
  try {
    mintKey = new PublicKey(mint);
  } catch {
    return NextResponse.json({ error: "That isn't a valid address." }, { status: 404 });
  }

  const origin = new URL("/", request.url).origin;
  const image = `${origin}/nft/passdari-voucher.png`;

  // Look the voucher up by its mint, so the expiry shown is the real one on-chain, not a guess. A voucher
  // that's already been redeemed or has expired and been cleaned up no longer has an account to find.
  let validity = "It is valid for 90 days after it's minted, and burned when it's used.";
  try {
    const [account] = await connection.getProgramAccounts(new PublicKey(PROGRAM_ID), {
      filters: [{ memcmp: { offset: VOUCHER_MINT_OFFSET, bytes: mintKey.toBase58() } }],
    });
    if (account) {
      const voucher: any = coder.accounts.decode("Voucher", account.account.data);
      const expiresAt = new Date(Number(voucher.expiresAt.toString()) * 1000);
      validity = `Valid until ${expiresAt.toISOString().slice(0, 10)}, or until it's used, whichever comes first.`;
    }
  } catch {
    // Left at the general 90-day sentence above.
  }

  return NextResponse.json({
    description: `A loyalty reward voucher from Passdari. Whoever holds this token can redeem it once, at the business that issued it. ${validity}`,
    image,
    properties: { files: [{ uri: image, type: "image/png" }], category: "image" },
    external_url: origin,
    attributes: [{ trait_type: "Voucher token", value: mint }],
  });
}
