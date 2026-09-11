"use client";

import { useEffect, useState } from "react";
import type { Program } from "@anchor-lang/core";

type Business = {
  name: string;
  category: string;
  rewardLabel: string;
  totalCards: number;
  totalStampsIssued: { toString: () => string };
  totalRedemptions: number;
  totalVouchersIssued: { toString: () => string };
};

type TopCustomer = {
  address: string;
  redemptions: number;
  name: string | null;
};

export function MerchantDashboard({ program, business }: { program: Program | null; business: Business }) {
  const [topCustomers, setTopCustomers] = useState<TopCustomer[] | null>(null);

  const stampsIssued = Number(business.totalStampsIssued.toString());
  const vouchersIssued = Number(business.totalVouchersIssued.toString());
  const vouchersPending = vouchersIssued - business.totalRedemptions;

  useEffect(() => {
    if (!program) return;

    async function load() {
      const allCards = await program!.account.loyaltyCard.all();

            console.log("All cards found:", allCards.length);
      allCards.forEach((entry) => {
        console.log(
          "Card —",
          (entry.account.customer as any).toBase58(),
          "redemptions:",
          entry.account.redemptions,
          "(type:",
          typeof entry.account.redemptions,
          ")"
        );
      });

      const sorted = allCards
        .map((entry) => ({
          address: (entry.account.customer as any).toBase58(),
          redemptions: entry.account.redemptions as number,
        }))
        .filter((c) => c.redemptions > 0)
        .sort((a, b) => b.redemptions - a.redemptions)
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

      setTopCustomers(
        sorted.map((c) => ({
          ...c,
          name: names[c.address] ?? null,
        }))
      );
    }

    load();
  }, [program]);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      <div>
        <p className="font-mono text-lg font-semibold text-ink">{business.name}</p>
        <p className="text-sm text-charcoal/60">
          {business.category} · {business.rewardLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-line rounded-lg p-3 bg-white/60">
          <p className="text-xs text-charcoal/60 mb-1">Cards registered</p>
          <p className="font-mono text-2xl font-semibold text-ink">{business.totalCards}</p>
        </div>
        <div className="border border-line rounded-lg p-3 bg-white/60">
          <p className="text-xs text-charcoal/60 mb-1">Stamps issued</p>
          <p className="font-mono text-2xl font-semibold text-ink">{stampsIssued}</p>
        </div>
        <div className="border border-line rounded-lg p-3 bg-white/60">
          <p className="text-xs text-charcoal/60 mb-1">Rewards given</p>
          <p className="font-mono text-2xl font-semibold text-ink">{business.totalRedemptions}</p>
        </div>
        <div className="border border-line rounded-lg p-3 bg-white/60">
          <p className="text-xs text-charcoal/60 mb-1">Vouchers pending</p>
          <p className="font-mono text-2xl font-semibold text-stamp-red">{vouchersPending}</p>
        </div>
      </div>

      {topCustomers && topCustomers.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-wider text-charcoal/60">
            Top loyal customers
          </p>
          <div className="border border-line rounded-lg divide-y divide-line bg-white/60">
            {topCustomers.map((c, i) => (
              <div key={c.address} className="flex justify-between items-center px-3 py-2 text-sm">
                <span className="font-mono text-charcoal/70">
                  {i + 1}. {c.name ?? `${c.address.slice(0, 4)}…${c.address.slice(-4)}`}
                </span>
                <span className="font-mono text-ink font-medium">
                  {c.redemptions} reward{c.redemptions === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}