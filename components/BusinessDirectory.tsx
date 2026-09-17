"use client";

import { useEffect, useState } from "react";
import { useCustomerProgram } from "@/lib/customerProgram";
import type { Keypair } from "@solana/web3.js";

type DirectoryEntry = {
  address: string;
  name: string;
  category: string;
  rewardLabel: string;
  stampsRequired: number;
};

export function BusinessDirectory({ keypair }: { keypair: Keypair }) {
  const program = useCustomerProgram(keypair);
  const [businesses, setBusinesses] = useState<DirectoryEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadIfStillCurrent() {
      if (!program) return;

      // Only this customer's own cards — the same filtered pattern used in
      // MyCards.tsx. offset 40 is where LoyaltyCard's `customer` field
      // sits, right after Anchor's 8-byte header and the `business` pubkey.
      const myCards = await program.account.loyaltyCard.all([
        {
          memcmp: {
            offset: 40,
            bytes: keypair.publicKey.toBase58(),
          },
        },
      ]);

      if (cancelled) return;

      // Fetch only the specific businesses this customer actually has a
      // card at — not every business on the platform.
      const entries = await Promise.all(
        myCards.map(async (card) => {
          const business = await program.account.business.fetch(card.account.business as any);
          return {
            address: (card.account.business as any).toBase58(),
            name: business.name as string,
            category: business.category as string,
            rewardLabel: business.rewardLabel as string,
            stampsRequired: business.stampsRequired as number,
          };
        })
      );

      if (cancelled) return;

      setBusinesses(entries);
    }

    loadIfStillCurrent();

    return () => {
      cancelled = true;
    };
  }, [program, keypair]);

  if (businesses === null) {
    return <p className="text-sm text-charcoal/60 font-mono">Loading businesses…</p>;
  }

  if (businesses.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="font-mono text-xs uppercase tracking-wider text-charcoal/60">
        Participating businesses
      </p>
      {businesses.map((b) => (
        <div key={b.address} className="border border-line rounded-lg p-3 text-sm bg-white/60">
          <p className="font-mono font-medium text-ink">{b.name}</p>
          <p className="text-xs text-charcoal/60">{b.category}</p>
          <p className="text-xs text-charcoal/60">
            {b.rewardLabel} — {b.stampsRequired} stamps
          </p>
        </div>
      ))}
    </div>
  );
}