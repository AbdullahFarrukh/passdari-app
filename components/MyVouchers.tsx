"use client";

import { useEffect, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { useCustomerProgram } from "@/lib/customerProgram";

type VoucherEntry = {
  address: string;
  voucherId: string;
  pendingRedemption: boolean;
};

export function MyVouchers({ keypair, refreshKey }: { keypair: Keypair; refreshKey: number }) {
  const program = useCustomerProgram(keypair);
  const [vouchers, setVouchers] = useState<VoucherEntry[] | null>(null);

  useEffect(() => {
    if (!program) return;

    async function load() {
      const myVouchers = await program!.account.voucher.all([
        {
          memcmp: {
            offset: 40,
            bytes: keypair.publicKey.toBase58(),
          },
        },
      ]);

      setVouchers(
        myVouchers.map((entry) => ({
          address: entry.publicKey.toBase58(),
          voucherId: (entry.account.voucherId as any).toString(),
          pendingRedemption: entry.account.pendingRedemption as boolean,
        }))
      );
    }

    load();
  }, [program, refreshKey]);

  if (vouchers === null) return null;
  if (vouchers.length === 0) return <p className="text-sm text-gray-500">No vouchers yet.</p>;

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="text-sm font-semibold">My vouchers</p>
      {vouchers.map((v) => (
        <div key={v.address} className="border rounded-lg p-3 text-sm flex justify-between">
          <span>Voucher #{v.voucherId}</span>
          <span className="text-gray-500">{v.pendingRedemption ? "Presented" : "Ready"}</span>
        </div>
      ))}
    </div>
  );
}