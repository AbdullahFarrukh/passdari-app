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

  if (businesses === null) return <p className="text-sm">Loading businesses...</p>;

  if (businesses.length === 0) {
    return <p className="text-sm text-gray-500">No businesses registered yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="text-sm font-semibold">Participating businesses</p>
      {businesses.map((b) => (
        <div key={b.address} className="border rounded-lg p-3 text-sm">
          <p className="font-medium">{b.name}</p>
          <p className="text-xs text-gray-500">{b.category}</p>
          <p className="text-xs text-gray-500">
            {b.rewardLabel} — {b.stampsRequired} stamps
          </p>
        </div>
      ))}
    </div>
  );
}