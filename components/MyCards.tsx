"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { useCustomerProgram } from "@/lib/customerProgram";

type CardWithBusiness = {
  cardAddress: string;
  businessAddress: any;
  stamps: number;
  stampsRequired: number;
  redemptions: number;
  name: string;
  rewardLabel: string;
};

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

  async function load() {
    if (!program) return;

    const myCards = await program.account.loyaltyCard.all([
      {
        memcmp: {
          offset: 40,
          bytes: keypair.publicKey.toBase58(),
        },
      },
    ]);

    const withBusinessInfo = await Promise.all(
      myCards.map(async (entry) => {
        const business = await program.account.business.fetch(entry.account.business as any);
        return {
          cardAddress: entry.publicKey.toBase58(),
          businessAddress: entry.account.business,
          stamps: entry.account.stamps as number,
          stampsRequired: business.stampsRequired as number,
          redemptions: entry.account.redemptions as number,
          name: business.name as string,
          rewardLabel: business.rewardLabel as string,
        };
      })
    );

    setCards(withBusinessInfo);
    onLoaded?.(withBusinessInfo.length);

    const totalStamps = withBusinessInfo.reduce((sum, c) => sum + c.stamps, 0);
    const completedCards = withBusinessInfo.filter((c) => c.stamps >= c.stampsRequired).length;
    const inProgressCards = withBusinessInfo.length - completedCards;
    onStats?.({ totalStamps, completedCards, inProgressCards });
  }

  useEffect(() => {
    load();
  }, [program, refreshKey]);

  async function handleMint(card: CardWithBusiness) {
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

      const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

      const tx = await program.methods
        .mintVoucher(voucherId)
        .accounts({
          business: card.businessAddress,
          card: new PublicKey(card.cardAddress),
          voucher: voucherPda,
          customer: keypair.publicKey,
          relayer: RELAYER_PUBLIC_KEY,
          systemProgram: SystemProgram.programId,
        })
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

      onChange();
    } catch (err) {
      setMintError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMintingFor(null);
    }
  }

  if (cards === null) {
    return <p className="text-sm text-charcoal/60 font-mono">Loading your cards…</p>;
  }

  if (cards.length === 0) {
    return (
      <p className="text-sm text-charcoal/60">
        No cards yet. Scan a receipt from a business to start your first one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <p className="font-mono text-xs uppercase tracking-wider text-charcoal/60">My cards</p>
      {cards.map((card) => {
        const isFull = card.stamps >= card.stampsRequired;
        return (
          <div
            key={card.cardAddress}
            className="border border-line rounded-lg p-4 bg-white/60"
          >
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-mono font-medium text-ink">{card.name}</span>
              <span className="font-mono text-xs text-charcoal/70">
                {card.stamps} / {card.stampsRequired}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {Array.from({ length: card.stampsRequired }).map((_, i) => {
                const filled = i < card.stamps;
                return (
                  <span
                    key={i}
                    className={`inline-block w-4 h-4 rounded-full border-2 ${
                      filled
                        ? isFull
                          ? "bg-stamp-red border-stamp-red"
                          : "bg-ink border-ink"
                        : "border-line bg-transparent"
                    }`}
                  />
                );
              })}
            </div>

            <p className="text-xs text-charcoal/60">{card.rewardLabel}</p>

            {isFull && (
              <button
                className="mt-3 w-full bg-stamp-red text-paper rounded-md py-2 text-sm font-medium disabled:opacity-50"
                disabled={mintingFor === card.cardAddress}
                onClick={() => handleMint(card)}
              >
                {mintingFor === card.cardAddress ? "Minting…" : "Mint voucher"}
              </button>
            )}
          </div>
        );
      })}
      {mintError && <p className="text-stamp-red text-sm">{mintError}</p>}
    </div>
  );
}