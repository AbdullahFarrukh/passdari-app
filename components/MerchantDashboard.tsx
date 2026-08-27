"use client";

type Business = {
  name: string;
  category: string;
  rewardLabel: string;
  totalCards: number;
  totalStampsIssued: { toString: () => string };
  totalRedemptions: number;
  totalVouchersIssued: { toString: () => string };
};

export function MerchantDashboard({ business }: { business: Business }) {
  const stampsIssued = Number(business.totalStampsIssued.toString());
  const vouchersIssued = Number(business.totalVouchersIssued.toString());
  const vouchersPending = vouchersIssued - business.totalRedemptions;

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
    </div>
  );
}