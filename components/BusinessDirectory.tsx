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
    if (!program) return;

    async function load() {
      const all = await program!.account.business.all();
      setBusinesses(
        all.map((entry) => ({
          address: entry.publicKey.toBase58(),
          name: entry.account.name as string,
          category: entry.account.category as string,
          rewardLabel: entry.account.rewardLabel as string,
          stampsRequired: entry.account.stampsRequired as number,
        }))
      );
    }

    load();
  }, [program]);

  if (businesses === null) {
    return <p className="text-sm text-charcoal/60 font-mono">Loading businesses…</p>;
  }

  if (businesses.length === 0) {
    return <p className="text-sm text-charcoal/60">No businesses registered yet.</p>;
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