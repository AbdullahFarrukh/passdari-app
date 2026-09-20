"use client";

import type { Program } from "@anchor-lang/core";
import type { Loyalty } from "@/lib/loyalty";
import { Keypair, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "@/lib/explorer";
import { OnChainId } from "@/components/ui/OnChainId";
import { StatStrip } from "@/components/ui/StatStrip";
import { StoreIcon } from "@/components/ui/icons";

type Business = {
  name: string;
  category: string;
  rewardLabel: string;
  totalCards: number;
  totalStampsIssued: { toString: () => string };
  totalRedemptions: number;
  totalVouchersIssued: { toString: () => string };
};

// The business's headline: who it is, where it lives on Solana, and the four numbers that matter.
// (The top customers list is its own panel, see TopCustomers.tsx.)
export function MerchantDashboard({
  business,
  keypair,
}: {
  program: Program<Loyalty> | null;
  business: Business;
  keypair: Keypair;
}) {
  const stampsIssued = Number(business.totalStampsIssued.toString());
  const vouchersIssued = Number(business.totalVouchersIssued.toString());
  const vouchersPending = vouchersIssued - business.totalRedemptions;

  // The business account's address is fixed: derived from the merchant's wallet.
  const [businessPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("business"), keypair.publicKey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="surface flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-paper-2 text-ink"><StoreIcon size={22} /></span>
          <div>
            <h1 className="font-mono text-xl font-semibold text-ink sm:text-2xl">{business.name}</h1>
            <p className="mt-0.5 text-sm text-muted">{business.category} · {business.rewardLabel}</p>
          </div>
        </div>
        <OnChainId label="Business account" address={businessPda.toBase58()} />
      </div>

      <StatStrip
        items={[
          { label: "Cards registered", value: business.totalCards },
          { label: "Stamps issued", value: stampsIssued },
          { label: "Rewards given", value: business.totalRedemptions },
          { label: "Vouchers pending", value: vouchersPending, alert: vouchersPending > 0 },
        ]}
      />
    </div>
  );
}
