"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { useCustomerProgram } from "@/lib/customerProgram";
import { translateError } from "@/lib/errorMessages";
import { Button } from "@/components/ui/Button";
import { LoyaltyCardReceipt } from "@/components/ui/LoyaltyCardReceipt";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  tokenAccountFor,
  voucherMetadataUri,
  voucherMintPda,
} from "@/lib/vouchers";
import { cardMintPda, cardNftRecordPda, findCardNfts } from "@/lib/cardNft";

type CardWithBusiness = {
  cardAddress: string;
  businessAddress: any;
  businessKey: string;
  stamps: number;
  stampsRequired: number;
  // Which of the card's NFTs is the current one (see lib/cardNft.ts), and whether the wallet holds it right now.
  nftCycle: number;
  cardNft: { mint: string; held: boolean } | null;
  lifetimeStamps: number;
  rewardsEarned: number;
  name: string;
  rewardLabel: string;
};

function toCard(
  entry: { publicKey: PublicKey; account: Record<string, unknown> },
  business: { stampsRequired: unknown; name: unknown; rewardLabel: unknown }
): CardWithBusiness {
  const stamps = entry.account.stamps as number;
  const lifetimeStamps = entry.account.lifetimeStamps as number;
  const stampsPerReward = entry.account.stampsRequiredSnapshot as number;
  return {
    cardAddress: entry.publicKey.toBase58(),
    businessAddress: entry.account.business,
    businessKey: (entry.account.business as PublicKey).toBase58(),
    stamps,
    stampsRequired: business.stampsRequired as number,
    nftCycle: entry.account.nftCycle as number,
    cardNft: null,
    lifetimeStamps,
    // Stamps only leave a card when they are spent on a voucher, so this is how many rewards the customer has earned.
    rewardsEarned: stampsPerReward > 0 ? Math.floor((lifetimeStamps - stamps) / stampsPerReward) : 0,
    name: business.name as string,
    rewardLabel: business.rewardLabel as string,
  };
}

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

export function MyCards({
  keypair,
  refreshKey,
  onChange,
  onLoaded,
  onStats,
}: {
  keypair: Keypair;
  refreshKey: number;
  onChange: () => void;
  onLoaded?: (count: number) => void;
  onStats?: (stats: { totalStamps: number; completedCards: number; inProgressCards: number }) => void;
}) {
  const program = useCustomerProgram(keypair);
  const [cards, setCards] = useState<CardWithBusiness[] | null>(null);
  const [mintingFor, setMintingFor] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadIfStillCurrent() {
      if (!program) return;

      const myCards = await program.account.loyaltyCard.all([
        {
          memcmp: {
            offset: 40,
            bytes: keypair.publicKey.toBase58(),
          },
        },
      ]);

      // If the user has already switched accounts by the time this
      // resolves, this result is stale — don't let it overwrite the
      // current, correct state with data from a previous session.
      if (cancelled) return;

      const withBusinessInfo = await Promise.all(
        myCards.map(async (entry) => {
          const business = await program.account.business.fetch(entry.account.business as any);
          return toCard(entry, business);
        })
      );

      // Whether each card's NFT is in the wallet. If the lookup fails the cards still show, just without the
      // NFT line.
      let nfts: { mint: PublicKey; held: boolean }[] = [];
      try {
        nfts = await findCardNfts(
          program.provider.connection,
          program.programId,
          keypair.publicKey,
          withBusinessInfo.map((c) => ({ address: new PublicKey(c.cardAddress), nftCycle: c.nftCycle }))
        );
      } catch (err) {
        console.error("Could not check the card NFTs:", err);
      }

      if (cancelled) return;

      const withNfts = withBusinessInfo.map((c, i) =>
        nfts[i] ? { ...c, cardNft: { mint: nfts[i].mint.toBase58(), held: nfts[i].held } } : c
      );

      setCards(withNfts);
      onLoaded?.(withNfts.length);

      const totalStamps = withBusinessInfo.reduce((sum, c) => sum + c.stamps, 0);
      const completedCards = withBusinessInfo.filter((c) => c.stamps >= c.stampsRequired).length;
      const inProgressCards = withBusinessInfo.length - completedCards;
      onStats?.({ totalStamps, completedCards, inProgressCards });
    }

    loadIfStillCurrent();

    return () => {
      cancelled = true;
    };
  }, [program, refreshKey]);

  async function handleGetReward(card: CardWithBusiness) {
    if (!program) return;
    setMintError(null);
    setMintingFor(card.cardAddress);

    try {
      const business = await program.account.business.fetch(card.businessAddress);
      const voucherId = business.totalVouchersIssued as BN;

      const [voucherPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("voucher"), card.businessAddress.toBuffer(), voucherId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      // The voucher is also an NFT: its own token mint, and the token account
      // that holds it in the customer's name.
      const voucherMint = voucherMintPda(program.programId, card.businessAddress, voucherId);
      const customerToken = tokenAccountFor(keypair.publicKey, voucherMint);

      // Cashing in spends the card's stamps, so the card's own NFT is burned in the same step. A card that has
      // no NFT (stamped before card NFTs existed) still works: the program skips it when nothing is there.
      const cardAddress = new PublicKey(card.cardAddress);
      const cardMint = cardMintPda(program.programId, cardAddress, card.nftCycle);
      const cardToken = tokenAccountFor(keypair.publicKey, cardMint);
      const cardNftRecord = cardNftRecordPda(program.programId, cardMint);
      // The record says who paid for the card's NFT, so its rent goes back to exactly them. A card NFT
      // minted before this record existed has none, and its rent goes to the relayer instead.
      const recordAccount = await program.account.cardNft.fetchNullable(cardNftRecord);
      const cardRentPayer = recordAccount?.rentPayer ?? RELAYER_PUBLIC_KEY;

      // Step 1: mint — this creates new accounts (the voucher, its NFT and
      // the customer's token account), so it goes through the relayer, same
      // as every other account-creating instruction.
      const tx = await program.methods
        .mintVoucher(voucherId, voucherMetadataUri(voucherMint, window.location.origin))
        .accounts({
          business: card.businessAddress,
          card: cardAddress,
          voucher: voucherPda,
          mint: voucherMint,
          customerToken,
          cardMint,
          cardToken,
          cardNftRecord,
          cardRentPayer,
          customer: keypair.publicKey,
          relayer: RELAYER_PUBLIC_KEY,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .transaction();

      tx.feePayer = RELAYER_PUBLIC_KEY;
      const { blockhash } = await program.provider.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.partialSign(keypair);

      const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");
      const res = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: serialized }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

            // Step 2: present — doesn't create anything, so no relayer field is
      // needed in the instruction itself, but the relayer should still be
      // the one paying the small transaction fee, matching MyVouchers.tsx's
      // own present button, so nobody at any point in this flow needs SOL.
      const presentTx = await program.methods
        .presentVoucher()
        .accounts({
          voucher: voucherPda,
          mint: voucherMint,
          holderToken: customerToken,
          owner: keypair.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        } as any)
        .transaction();

      presentTx.feePayer = RELAYER_PUBLIC_KEY;
      const presentBlockhash = await program.provider.connection.getLatestBlockhash();
      presentTx.recentBlockhash = presentBlockhash.blockhash;
      presentTx.partialSign(keypair);

      const presentSerialized = presentTx.serialize({ requireAllSignatures: false }).toString("base64");
      const presentRes = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: presentSerialized }),
      });
      const presentData = await presentRes.json();
      if (presentData.error) throw new Error(presentData.error);

      onChange();
    } catch (err) {
      setMintError(translateError(err));
    } finally {
      setMintingFor(null);
    }
  }

  if (cards === null) {
    return <p className="font-mono text-sm text-muted">Loading your cards…</p>;
  }

  if (cards.length === 0) {
    return (
      <section aria-labelledby="my-cards" className="flex w-full flex-col gap-3">
        <h2 id="my-cards" className="text-2xl text-ink">My cards</h2>
        <p className="rounded-xl border-2 border-dashed border-ink bg-surface p-5 text-sm text-muted">
          No cards yet. Scan a receipt from a business to start your first one.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="my-cards" className="flex w-full flex-col gap-3">
      <h2 id="my-cards" className="text-2xl text-ink">My cards</h2>
      <div className="flex flex-col gap-6">
        {cards.map((card) => {
          const isFull = card.stamps >= card.stampsRequired;
          return (
            <div key={card.cardAddress} className="flex flex-col gap-3">
              <LoyaltyCardReceipt
                businessName={card.name}
                rewardLabel={card.rewardLabel}
                stamps={card.stamps}
                stampsRequired={card.stampsRequired}
                cardAddress={card.cardAddress}
                cardNft={card.cardNft}
              />

              {isFull && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-stamp-red/10 p-3">
                  <p className="min-w-40 flex-1 text-sm font-medium text-stamp-red">Card complete. Your reward is ready.</p>
                  <Button variant="danger" disabled={mintingFor === card.cardAddress} onClick={() => handleGetReward(card)}>
                    {mintingFor === card.cardAddress ? "Getting your reward…" : `Get my ${card.rewardLabel}`}
                  </Button>
                </div>
              )}

              <dl className="grid grid-cols-2 rounded-xl border-2 border-line bg-surface text-sm">
                <div className="px-4 py-2.5">
                  <dt className="eyebrow">Stamps earned</dt>
                  <dd className="font-mono font-semibold text-ink">{card.lifetimeStamps}</dd>
                </div>
                <div className="border-l-2 border-line px-4 py-2.5">
                  <dt className="eyebrow">Rewards earned</dt>
                  <dd className="font-mono font-semibold text-ink">{card.rewardsEarned}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
      {mintError && <p role="alert" className="err">{mintError}</p>}
    </section>
  );
}
