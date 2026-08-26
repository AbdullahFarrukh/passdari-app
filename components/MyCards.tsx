"use client";

import { useEffect, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { useCustomerProgram } from "@/lib/customerProgram";

type CardWithBusiness = {
  cardAddress: string;
  business: string;
  stamps: number;
  stampsRequired: number;
  name: string;
  rewardLabel: string;
};

export function MyCards({ keypair }: { keypair: Keypair }) {
  const program = useCustomerProgram(keypair);
  const [cards, setCards] = useState<CardWithBusiness[] | null>(null);

  useEffect(() => {
    if (!program) return;

    async function load() {
      const myCards = await program!.account.loyaltyCard.all([
        {
          memcmp: {
            offset: 40,
            bytes: keypair.publicKey.toBase58(),
          },
        },
      ]);

      const withBusinessInfo = await Promise.all(
        myCards.map(async (entry) => {
          const business = await program!.account.business.fetch(entry.account.business as any);
          return {
            cardAddress: entry.publicKey.toBase58(),
            business: (entry.account.business as any).toBase58(),
            stamps: entry.account.stamps as number,
            stampsRequired: business.stampsRequired as number,
            name: business.name as string,
            rewardLabel: business.rewardLabel as string,
          };
        })
      );

      setCards(withBusinessInfo);
    }

    load();
  }, [program]);

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
      {cards.map((card) => (
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
        </div>
      ))}
    </div>
  );
}