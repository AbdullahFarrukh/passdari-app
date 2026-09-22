import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { AnchorProvider, Program, setProvider } from "@anchor-lang/core";
import idl from "./loyalty.json";
import type { Loyalty } from "./loyalty";
import { PROGRAM_ID } from "./explorer";
import { getOnChainNow } from "./onChainClock";
import { TOKEN_2022_PROGRAM_ID, tokenAccountFor } from "./vouchers";
import { cardMintPda } from "./cardNft";

// Rent that nobody is coming back for: a stamp collected 90 days ago and never claimed into a reward
// stays a card NFT nobody's using, and a voucher nobody redeemed within 90 days stays minted forever
// unless something closes it. This sweeps both up (and the older, simpler case: an expired, unclaimed
// receipt), sending each one's rent back to whoever paid it. It costs the caller (the relayer) only a
// small transaction fee per item closed, and every item closed hands back far more than that fee, so
// running this is never a loss.
//
// None of the three closing instructions need the business owner or the customer to sign — the address
// each one's rent must return to is fixed on the account itself, so nobody can misdirect it. That's what
// lets this run as a page-load count, a merchant's button, and an unattended daily job, from the same code.

const programId = new PublicKey(PROGRAM_ID);
const CARD_NFT_IDLE_SECONDS = 90 * 24 * 60 * 60;

function programWithRelayer(connection: Connection, relayer: Keypair): Program<Loyalty> {
  const wallet = {
    publicKey: relayer.publicKey,
    async signTransaction<T extends Transaction>(tx: T): Promise<T> {
      tx.partialSign(relayer);
      return tx;
    },
    async signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]> {
      txs.forEach((tx) => tx.partialSign(relayer));
      return txs;
    },
  };
  const provider = new AnchorProvider(connection, wallet as any, {});
  setProvider(provider);
  return new Program<Loyalty>(idl as Loyalty, provider);
}

type Scope = { business: PublicKey } | { business?: undefined }; // undefined business = every business

async function businessFilter(scope: Scope) {
  return "business" in scope && scope.business
    ? [{ memcmp: { offset: 8, bytes: scope.business.toBase58() } }]
    : [];
}

export type CleanupSummary = {
  receipts: { found: number; closed: number };
  vouchers: { found: number; closed: number };
  cardNfts: { found: number; closed: number };
};

// Finds what's stale, without touching anything. Cheap enough to run on a page load.
export async function findStaleRent(connection: Connection, scope: Scope) {
  const program = programWithRelayer(connection, Keypair.generate()); // read-only: no real key needed to fetch accounts
  const [now, receipts, vouchers, cards] = await Promise.all([
    getOnChainNow(connection),
    program.account.receipt.all(await businessFilter(scope)),
    program.account.voucher.all(await businessFilter(scope)),
    program.account.loyaltyCard.all(await businessFilter(scope)),
  ]);

  const staleReceipts = receipts.filter((r) => Number((r.account.expiresAt as any).toString()) <= now);
  const staleVouchers = vouchers.filter((v) => Number((v.account.expiresAt as any).toString()) <= now);

  const idleCandidates = cards.filter((c) => now - Number((c.account.lastStampTs as any).toString()) >= CARD_NFT_IDLE_SECONDS);
  const idleMints = idleCandidates.map((c) => cardMintPda(programId, c.publicKey, c.account.nftCycle as number));
  // An idle card only has something to close if its current cycle's NFT actually exists.
  const idleExist = idleMints.length ? await connection.getMultipleAccountsInfo(idleMints) : [];
  const idleCards = idleCandidates.filter((_, i) => idleExist[i] !== null);

  return { now, staleReceipts, staleVouchers, idleCards, program };
}

// Finds and closes everything stale, sending each item's rent back to whoever paid it. Runs each closing
// instruction in its own small transaction — these are maintenance, not a user waiting on a screen, so
// reliability (one bad account never blocks the rest) matters more than batching them tightly.
export async function runCleanup(connection: Connection, relayer: Keypair, scope: Scope): Promise<CleanupSummary> {
  const { staleReceipts, staleVouchers, idleCards, program } = await findStaleRent(connection, scope);
  const relayerProgram = programWithRelayer(connection, relayer);

  const receiptIxs: TransactionInstruction[] = await Promise.all(
    staleReceipts.map((r) =>
      relayerProgram.methods
        .reclaimExpiredReceipt()
        .accounts({ receipt: r.publicKey, rentPayer: r.account.rentPayer } as any)
        .instruction()
    )
  );

  const voucherIxs: TransactionInstruction[] = await Promise.all(
    staleVouchers.map((v) => {
      const mint = v.account.mint as PublicKey;
      // The token normally never left the wallet it was minted or gifted into — see the module note above
      // on why an address that turns out to be wrong is harmless, just skipped.
      const holderToken = tokenAccountFor(v.account.owner as PublicKey, mint);
      return relayerProgram.methods
        .closeExpiredVoucher()
        .accounts({
          voucher: v.publicKey,
          mint,
          holderToken,
          rentPayer: v.account.rentPayer,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        } as any)
        .instruction();
    })
  );

  const cardIxs: TransactionInstruction[] = [];
  for (const c of idleCards) {
    const mint = cardMintPda(programId, c.publicKey, c.account.nftCycle as number);
    const record = PublicKey.findProgramAddressSync([Buffer.from("card_nft"), mint.toBuffer()], programId)[0];
    const recordInfo = await connection.getAccountInfo(record);
    if (!recordInfo) continue; // no record: an NFT from before records existed, left for cash-in to handle
    const rentPayer = program.coder.accounts.decode("CardNft", recordInfo.data).rentPayer as PublicKey;
    cardIxs.push(
      await relayerProgram.methods
        .retireIdleCardNft()
        .accounts({
          card: c.publicKey,
          customer: c.account.customer,
          cardMint: mint,
          cardToken: tokenAccountFor(c.account.customer as PublicKey, mint),
          record,
          rentPayer,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        } as any)
        .instruction()
    );
  }

  const send = async (ixs: TransactionInstruction[]): Promise<number> => {
    let closed = 0;
    for (const ix of ixs) {
      try {
        const tx = new Transaction().add(ix);
        tx.feePayer = relayer.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.sign(relayer); // only the relayer signs — nobody else's rent can ever be misdirected, so nobody else needs to
        const sig = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(sig, "confirmed");
        closed++;
      } catch (err) {
        console.error("Cleanup instruction failed:", err instanceof Error ? err.message : err);
      }
    }
    return closed;
  };

  const [receiptsClosed, vouchersClosed, cardsClosed] = await Promise.all([
    send(receiptIxs),
    send(voucherIxs),
    send(cardIxs),
  ]);

  return {
    receipts: { found: staleReceipts.length, closed: receiptsClosed },
    vouchers: { found: staleVouchers.length, closed: vouchersClosed },
    cardNfts: { found: idleCards.length, closed: cardsClosed },
  };
}
