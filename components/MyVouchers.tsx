"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useCustomerProgram } from "@/lib/customerProgram";

type VoucherEntry = {
  address: string;
  voucherId: string;
  pendingRedemption: boolean;
};

export function MyVouchers({
  keypair,
  refreshKey,
  onChange,
}: {
  keypair: Keypair;
  refreshKey: number;
  onChange: () => void;
}) {
  const program = useCustomerProgram(keypair);
  const [vouchers, setVouchers] = useState<VoucherEntry[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [giftAddress, setGiftAddress] = useState<Record<string, string>>({});

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

  async function handlePresent(voucherAddress: string) {
    if (!program) return;
    setError(null);
    setBusy(voucherAddress);

    try {
      await program.methods
        .presentVoucher()
        .accounts({
          voucher: new PublicKey(voucherAddress),
          owner: keypair.publicKey,
        })
        .rpc();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel(voucherAddress: string) {
    if (!program) return;
    setError(null);
    setBusy(voucherAddress);

    try {
      await program.methods
        .cancelPresentation()
        .accounts({
          voucher: new PublicKey(voucherAddress),
          owner: keypair.publicKey,
        })
        .rpc();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handleGift(voucherAddress: string) {
    if (!program) return;
    const recipient = giftAddress[voucherAddress];
    if (!recipient) return;

    setError(null);
    setBusy(voucherAddress);

    try {
      const newOwner = new PublicKey(recipient);

      await program.methods
        .transferVoucher(newOwner)
        .accounts({
          voucher: new PublicKey(voucherAddress),
          owner: keypair.publicKey,
        })
        .rpc();

      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (vouchers === null) return null;
  if (vouchers.length === 0) return <p className="text-sm text-gray-500">No vouchers yet.</p>;

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="text-sm font-semibold">My vouchers</p>
      {vouchers.map((v) => (
        <div key={v.address} className="border rounded-lg p-3 text-sm flex flex-col gap-2">
          <div className="flex justify-between">
            <span>Voucher #{v.voucherId}</span>
            <span className="text-gray-500">{v.pendingRedemption ? "Presented" : "Ready"}</span>
          </div>

          {!v.pendingRedemption && (
            <>
              <button disabled={busy === v.address} onClick={() => handlePresent(v.address)}>
                {busy === v.address ? "Presenting..." : "Present to merchant"}
              </button>

              <div className="flex gap-2">
                <input
                  placeholder="Recipient's address"
                  className="flex-1"
                  value={giftAddress[v.address] ?? ""}
                  onChange={(e) =>
                    setGiftAddress((prev) => ({ ...prev, [v.address]: e.target.value }))
                  }
                />
                <button disabled={busy === v.address} onClick={() => handleGift(v.address)}>
                  {busy === v.address ? "Sending..." : "Gift"}
                </button>
              </div>
            </>
          )}

          {v.pendingRedemption && (
            <button disabled={busy === v.address} onClick={() => handleCancel(v.address)}>
              {busy === v.address ? "Cancelling..." : "Cancel"}
            </button>
          )}
        </div>
      ))}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}