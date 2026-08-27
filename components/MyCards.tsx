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

      await program.methods
        .mintVoucher(voucherId)
        .accounts({
          business: card.businessAddress,
          card: new PublicKey(card.cardAddress),
          voucher: voucherPda,
          customer: keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      onChange();
    } catch (err) {
      setMintError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMintingFor(null);
    }
  }

  if (cards === null) return <p className="text-sm">Loading your cards...</p>;

  if (cards.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No cards yet. Scan a receipt from a business to start your first one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <p className="text-sm font-semibold">My cards</p>
      {cards.map((card) => {
        const isFull = card.stamps >= card.stampsRequired;
        return (
          <div key={card.cardAddress} className="border rounded-lg p-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{card.name}</span>
              <span className="text-gray-500">
                {card.stamps} / {card.stampsRequired}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600"
                style={{
                  width: `${Math.min(100, (card.stamps / card.stampsRequired) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{card.rewardLabel}</p>
            {isFull && (
              <button
                className="mt-2 w-full"
                disabled={mintingFor === card.cardAddress}
                onClick={() => handleMint(card)}
              >
                {mintingFor === card.cardAddress ? "Minting..." : "Mint voucher"}
              </button>
            )}
          </div>
        );
      })}
      {mintError && <p className="text-red-600 text-sm">{mintError}</p>}
    </div>
  );
}