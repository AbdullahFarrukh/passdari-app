"use client";

import { useEffect, useState } from "react";
import { useCustomerProgram } from "@/lib/customerProgram";
import type { Keypair } from "@solana/web3.js";
import { OnChainId } from "@/components/ui/OnChainId";
import { StoreIcon } from "@/components/ui/icons";

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
    return <p className="font-mono text-sm text-muted">Loading businesses…</p>;
  }

  if (businesses.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="businesses" className="flex flex-col gap-3">
      <h2 id="businesses" className="eyebrow">Participating businesses</h2>
      {businesses.map((b) => (
        <article key={b.address} className="surface p-4">
          <div className="flex items-center gap-2 text-ink">
            <StoreIcon size={18} />
            <h3 className="font-mono font-semibold">{b.name}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">
            {b.category} · {b.rewardLabel} after {b.stampsRequired} stamp{b.stampsRequired === 1 ? "" : "s"}
          </p>
          <div className="mt-3"><OnChainId label="Business" address={b.address} /></div>
        </article>
      ))}
    </section>
  );
}
