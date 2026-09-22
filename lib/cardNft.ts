import { Connection, PublicKey } from "@solana/web3.js";
import { tokenAccountFor } from "@/lib/vouchers";

// A stamp card also comes as an NFT: a Token-2022 token in the customer's wallet that can't be sent to
// anyone else, and is burned when the card's stamps are spent on a voucher. The live stamp count is not in the
// token — it stays on the card account — so the token is proof of "this wallet holds a card from this business".
//
// A card has one NFT at a time. Its address depends on the card's `nftCycle`, which goes up each time the
// NFT is burned, so every NFT gets a fresh address.

// The program refuses a metadata link longer than this.
const MAX_CARD_URI_LENGTH = 100;

export function cardMintPda(programId: PublicKey, card: PublicKey, cycle: number): PublicKey {
  const cycleBytes = Buffer.alloc(4);
  cycleBytes.writeUInt32LE(cycle);
  const [mint] = PublicKey.findProgramAddressSync(
    [Buffer.from("card_mint"), card.toBuffer(), cycleBytes],
    programId
  );
  return mint;
}

// Records who paid for a given cycle's NFT, at ["card_nft", mint]. Rent from the NFT goes back to exactly
// this wallet — when the card is cashed in, or when the NFT is recycled after 90 days with no stamp.
export function cardNftRecordPda(programId: PublicKey, mint: PublicKey): PublicKey {
  const [record] = PublicKey.findProgramAddressSync([Buffer.from("card_nft"), mint.toBuffer()], programId);
  return record;
}

// The link stored inside the NFT, pointing at this app's own small page that describes it
// (see app/c/[mint]/route.ts). Too long to fit? Mint without one: the name and symbol are stored
// on-chain either way.
export function cardMetadataUri(mint: PublicKey, appOrigin: string): string {
  const uri = `${appOrigin}/c/${mint.toBase58()}`;
  return uri.length <= MAX_CARD_URI_LENGTH ? uri : "";
}

// Whether the card's current NFT has been made yet. It hasn't for a card that was stamped before card NFTs
// existed, or one whose NFT was just burned by cashing in; the next stamp brings it.
export async function cardMintExists(connection: Connection, mint: PublicKey): Promise<boolean> {
  return (await connection.getAccountInfo(mint)) !== null;
}

// For each card, whether its wallet holds the card's NFT right now. Read from the token account itself,
// so a card whose token was burned by its holder shows as not held.
export async function findCardNfts(
  connection: Connection,
  programId: PublicKey,
  owner: PublicKey,
  cards: { address: PublicKey; nftCycle: number }[]
): Promise<{ mint: PublicKey; held: boolean }[]> {
  const mints = cards.map((c) => cardMintPda(programId, c.address, c.nftCycle));
  const tokenAccounts = mints.map((mint) => tokenAccountFor(owner, mint));

  const held: boolean[] = [];
  // The RPC accepts at most 100 addresses at a time.
  for (let i = 0; i < tokenAccounts.length; i += 100) {
    const { value } = await connection.getMultipleParsedAccounts(tokenAccounts.slice(i, i + 100));
    for (const info of value) {
      const parsed = info && !Buffer.isBuffer(info.data) ? info.data.parsed : null;
      held.push(parsed?.type === "account" && parsed.info.tokenAmount.amount === "1");
    }
  }
  return mints.map((mint, i) => ({ mint, held: held[i] }));
}
