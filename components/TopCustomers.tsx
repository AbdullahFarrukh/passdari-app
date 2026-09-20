"use client";

import { useEffect, useState } from "react";
import type { Program } from "@anchor-lang/core";
import type { Loyalty } from "@/lib/loyalty";
import { Keypair, PublicKey } from "@solana/web3.js";
import { OnChainId } from "@/components/ui/OnChainId";

type TopCustomer = {
  address: string;
  rewards: number;
  name: string | null;
};

export function TopCustomers({ program, keypair }: { program: Program<Loyalty> | null; keypair: Keypair }) {
  const [topCustomers, setTopCustomers] = useState<TopCustomer[] | null>(null);

  useEffect(() => {
    if (!program) return;

    async function load() {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program!.programId
      );

      const allCards = await program!.account.loyaltyCard.all([
        { memcmp: { offset: 8, bytes: businessPda.toBase58() } },
      ]);

      // Redemptions are counted on the business now, not on each customer's
      // card — a voucher can be gifted, so the person redeeming it may never
      // have had a card here. What a card still knows is how many rewards its
      // customer has earned: stamps only ever leave a card when they're
      // spent on a voucher, and each voucher costs the card's own required
      // count. So (every stamp ever earned) minus (stamps still on the card)
      // divided by that count is the number of vouchers they've made.
      const sorted = allCards
        .map((entry) => {
          const spent = (entry.account.lifetimeStamps as number) - (entry.account.stamps as number);
          const perReward = entry.account.stampsRequiredSnapshot as number;
          return {
            address: (entry.account.customer as PublicKey).toBase58(),
            rewards: perReward > 0 ? Math.floor(spent / perReward) : 0,
          };
        })
        .filter((c) => c.rewards > 0)
        .sort((a, b) => b.rewards - a.rewards)
        .slice(0, 5);

      let names: Record<string, string> = {};
      const addressList = sorted.map((c) => c.address).join(",");
      if (addressList) {
        try {
          const res = await fetch(`/api/customer-name?addresses=${addressList}`);
          const data = await res.json();
          names = data.names ?? {};
        } catch (err) {
          console.error("Could not load customer names:", err);
        }
      }

      setTopCustomers(sorted.map((c) => ({ ...c, name: names[c.address] ?? null })));
    }

    load();
  }, [program, keypair]);

  return (
    <section aria-labelledby="top-customers" className="surface p-4 sm:p-5">
      <h2 id="top-customers" className="eyebrow">Top loyal customers</h2>
      {topCustomers && topCustomers.length > 0 ? (
        <ol className="mt-3 divide-y divide-line">
          {topCustomers.map((c, i) => (
            <li key={c.address} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-5 text-right font-mono text-sm text-muted">{i + 1}</span>
                {c.name && <span className="truncate text-sm font-medium">{c.name}</span>}
                <OnChainId address={c.address} label={c.name ? undefined : "Wallet"} />
              </div>
              <span className="font-mono text-sm font-semibold text-ink">
                {c.rewards} reward{c.rewards === 1 ? "" : "s"} earned
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {topCustomers === null ? "Loading…" : "No rewards earned yet. Customers who complete a card will appear here."}
        </p>
      )}
    </section>
  );
}
