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
        <p className="text-lg font-semibold">{business.name}</p>
        <p className="text-sm text-gray-500">
          {business.category} · {business.rewardLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500">Cards registered</p>
          <p className="text-xl font-semibold">{business.totalCards}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500">Stamps issued</p>
          <p className="text-xl font-semibold">{stampsIssued}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500">Rewards given</p>
          <p className="text-xl font-semibold">{business.totalRedemptions}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-gray-500">Vouchers pending</p>
          <p className="text-xl font-semibold">{vouchersPending}</p>
        </div>
      </div>
    </div>
  );
}