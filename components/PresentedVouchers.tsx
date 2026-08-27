"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/lib/useProgram";

type PresentedVoucher = {
  address: string;
  voucherId: string;
  owner: string;
};

export function PresentedVouchers({
  wallet,
  refreshKey,
  onChange,
}: {
  wallet: { publicKey: PublicKey };
  refreshKey: number;
  onChange: () => void;
}) {
  const program = useProgram();
  const [vouchers, setVouchers] = useState<PresentedVoucher[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program) return;

    async function load() {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), wallet.publicKey.toBuffer()],
        program!.programId
      );

      const all = await program!.account.voucher.all([
        {
          memcmp: {
            offset: 8,
            bytes: businessPda.toBase58(),
          },
        },
      ]);

      const presented = all.filter((entry) => entry.account.pendingRedemption);

      setVouchers(
        presented.map((entry) => ({
          address: entry.publicKey.toBase58(),
          voucherId: (entry.account.voucherId as any).toString(),
          owner: (entry.account.owner as any).toBase58(),
        }))
      );
    }

    load();
  }, [program, refreshKey]);

  async function handleRedeem(voucherAddress: string) {
    if (!program) return;
    setError(null);
    setBusy(voucherAddress);

    try {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .redeemVoucher()
        .accounts({
          business: businessPda,
          voucher: new PublicKey(voucherAddress),
          authority: wallet.publicKey,
        })
        .rpc();

      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (!vouchers || vouchers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="font-mono text-xs uppercase tracking-wider text-charcoal/60">
        Presented vouchers
      </p>
      <div className="border border-line rounded-lg divide-y divide-line bg-white/60">
        {vouchers.map((v) => (
          <div key={v.address} className="flex justify-between items-center px-3 py-2">
            <div>
              <p className="font-mono text-sm text-ink">Voucher #{v.voucherId}</p>
              <p className="text-xs text-charcoal/50 font-mono">
                {v.owner.slice(0, 4)}…{v.owner.slice(-4)}
              </p>
            </div>
            <button
              disabled={busy === v.address}
              onClick={() => handleRedeem(v.address)}
              className="bg-stamp-red text-paper rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {busy === v.address ? "Redeeming…" : "Redeem"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}