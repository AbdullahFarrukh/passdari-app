"use client";

import type { Program } from "@anchor-lang/core";
import type { Loyalty } from "@/lib/loyalty";
import { Keypair, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "@/lib/explorer";
import { OnChainId } from "@/components/ui/OnChainId";
import { Receipt } from "@/components/ui/Receipt";
import { StatStrip } from "@/components/ui/StatStrip";

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
      <Receipt className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6">
        <div>
          <h1 className="text-4xl leading-none text-ink sm:text-5xl">{business.name}</h1>
          <p className="mt-1 text-sm text-muted">{business.category} · {business.rewardLabel}</p>
        </div>
        <OnChainId label="Business account" address={businessPda.toBase58()} />
      </Receipt>

      <StatStrip
        title="TILL REPORT"
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
