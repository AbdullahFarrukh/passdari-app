import { AccountInfo, Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// A voucher is a Token-2022 NFT. Whoever holds the token owns the voucher —
// the `owner` field on the Voucher account is only a hint that can go stale
// (a wallet can move the NFT without telling our program), so nothing in
// here trusts it as the answer. It's only ever used as a first guess for
// where to look, and the real holder is always confirmed from the token.
export const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

// Where the `mint` field starts inside a Voucher account: 8 bytes of Anchor's
// own header, then the business (32) and the owner hint (32).
export const VOUCHER_MINT_OFFSET = 72;

// The program refuses a metadata link longer than this.
const MAX_VOUCHER_URI_LENGTH = 100;

export function voucherMintPda(programId: PublicKey, business: PublicKey, voucherId: BN): PublicKey {
  const [mint] = PublicKey.findProgramAddressSync(
    [Buffer.from("voucher_mint"), business.toBuffer(), voucherId.toArrayLike(Buffer, "le", 8)],
    programId
  );
  return mint;
}

// The standard token account a wallet holds a given token in.
export function tokenAccountFor(owner: PublicKey, mint: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

// The link stored inside the NFT, pointing at this app's own small page that
// describes it (see app/v/[mint]/route.ts). If the app's address is so long
// that the link wouldn't fit, mint without one — the name and symbol are
// stored on-chain either way, so the voucher still shows up properly.
export function voucherMetadataUri(mint: PublicKey, appOrigin: string): string {
  const uri = `${appOrigin}/v/${mint.toBase58()}`;
  return uri.length <= MAX_VOUCHER_URI_LENGTH ? uri : "";
}

export type VoucherHolder = {
  tokenAccount: PublicKey;
  owner: PublicKey;
  frozen: boolean;
};

type TokenAccountFacts = VoucherHolder & { amount: bigint };

function readTokenAccount(
  address: PublicKey,
  info: AccountInfo<Buffer | ParsedAccountData> | null
): TokenAccountFacts | null {
  if (!info || Buffer.isBuffer(info.data)) return null;
  const parsed = info.data.parsed;
  if (parsed?.type !== "account") return null;
  return {
    tokenAccount: address,
    owner: new PublicKey(parsed.info.owner),
    frozen: parsed.info.state === "frozen",
    amount: BigInt(parsed.info.tokenAmount.amount),
  };
}

// Everything a customer's wallet holds that looks like a voucher: exactly one
// token with no decimals that can be moved. The caller still has to check each mint really is
// one of our vouchers, since anyone can send any NFT to any wallet.
export async function listHeldNfts(
  connection: Connection,
  owner: PublicKey
): Promise<{ mint: PublicKey; tokenAccount: PublicKey; frozen: boolean }[]> {
  const { value } = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  return value
    .filter(({ account }) => {
      const info = account.data.parsed.info;
      // Stamp card NFTs can't be moved (the token program marks their accounts), and they are not vouchers.
      const soulbound = info.extensions?.some((e: { extension: string }) => e.extension === "nonTransferableAccount");
      return !soulbound && info.tokenAmount.decimals === 0 && info.tokenAmount.amount === "1";
    })
    .map(({ pubkey, account }) => ({
      mint: new PublicKey(account.data.parsed.info.mint),
      tokenAccount: pubkey,
      frozen: account.data.parsed.info.state === "frozen",
    }));
}

// Works out who really holds each voucher right now, straight from the token.
// The owner hint is checked first because it's right almost every time and
// lets all of them be looked up in one request. Only a voucher whose hint
// turns out to be wrong (it was moved outside our program) costs an extra
// lookup to find where it actually went. A voucher nobody holds any more
// (it was redeemed and burned) comes back as null.
export async function findHolders(
  connection: Connection,
  vouchers: { mint: PublicKey; ownerHint: PublicKey }[]
): Promise<(VoucherHolder | null)[]> {
  const guesses = vouchers.map((v) => tokenAccountFor(v.ownerHint, v.mint));
  const found: (TokenAccountFacts | null)[] = [];

  // The RPC accepts at most 100 addresses at a time.
  for (let i = 0; i < guesses.length; i += 100) {
    const batch = guesses.slice(i, i + 100);
    const { value } = await connection.getMultipleParsedAccounts(batch);
    value.forEach((info, j) => found.push(readTokenAccount(batch[j], info)));
  }

  return Promise.all(
    vouchers.map(async (v, i) => {
      const guess = found[i];
      if (guess && guess.amount === BigInt(1)) return guess;

      const { value: largest } = await connection.getTokenLargestAccounts(v.mint);
      const holding = largest.find((a) => a.amount === "1");
      if (!holding) return null;

      const { value: info } = await connection.getParsedAccountInfo(holding.address);
      const actual = readTokenAccount(holding.address, info);
      return actual && actual.amount === BigInt(1) ? actual : null;
    })
  );
}
