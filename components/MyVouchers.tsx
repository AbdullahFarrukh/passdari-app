"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useCustomerProgram } from "@/lib/customerProgram";
import { translateError } from "@/lib/errorMessages";

type VoucherEntry = {
  address: string;
  voucherId: string;
  pendingRedemption: boolean;
};

export function MyVouchers({
  keypair,
  refreshKey,
  onChange,
  onCount,
}: {
  keypair: Keypair;
  refreshKey: number;
  onChange: () => void;
  onCount?: (count: number) => void;
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

      const mapped = myVouchers.map((entry) => ({
        address: entry.publicKey.toBase58(),
        voucherId: (entry.account.voucherId as any).toString(),
        pendingRedemption: entry.account.pendingRedemption as boolean,
      }));

      setVouchers(mapped);
      onCount?.(mapped.length);
    }

    load();
  }, [program, refreshKey]);

  const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

  async function relaySign(tx: any) {
    tx.feePayer = RELAYER_PUBLIC_KEY;
    const { blockhash } = await program!.provider.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.partialSign(keypair);

    const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");
    const res = await fetch("/api/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: serialized }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
  }

  async function handlePresent(voucherAddress: string) {
    if (!program) return;
    setError(null);
    setBusy(voucherAddress);

    try {
      const tx = await program.methods
        .presentVoucher()
        .accounts({
          voucher: new PublicKey(voucherAddress),
          owner: keypair.publicKey,
        } as any)
        .transaction();

      await relaySign(tx);
      onChange();
    } catch (err) {
            setError(translateError(err));
    } finally {
      setBusy(null);
    }
  }

    async function handleCancel(voucherAddress: string) {
    if (!program) return;
    setError(null);
    setBusy(voucherAddress);

    try {
      const tx = await program.methods
        .cancelPresentation()
        .accounts({
          voucher: new PublicKey(voucherAddress),
          owner: keypair.publicKey,
        } as any)
        .transaction();

      await relaySign(tx);
      onChange();
    } catch (err) {
            setError(translateError(err));
    } finally {
      setBusy(null);
    }
  }

    async function handleGift(voucherAddress: string, recipient: string) {
    if (!program) return;
    setError(null);
    setBusy(voucherAddress);

    try {
      const newOwner = new PublicKey(recipient);
      const tx = await program.methods
        .transferVoucher(newOwner)
        .accounts({
          voucher: new PublicKey(voucherAddress),
          owner: keypair.publicKey,
        } as any)
        .transaction();

      await relaySign(tx);
      onChange();
    } catch (err) {
            setError(translateError(err));
    } finally {
      setBusy(null);
    }
  }

  if (vouchers === null) return null;
  if (vouchers.length === 0) {
    return <p className="text-sm text-charcoal/60">No vouchers yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="font-mono text-xs uppercase tracking-wider text-charcoal/60">My vouchers</p>
      {vouchers.map((v) => (
        <div
          key={v.address}
          className="border border-line rounded-lg p-3 text-sm flex flex-col gap-2 bg-white/60"
        >
          <div className="flex justify-between items-baseline">
            <span className="font-mono font-medium text-ink">Voucher #{v.voucherId}</span>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                v.pendingRedemption
                  ? "bg-stamp-red/10 text-stamp-red"
                  : "bg-quiet-green/10 text-quiet-green"
              }`}
            >
              {v.pendingRedemption ? "Presented" : "Ready"}
            </span>
          </div>

          {!v.pendingRedemption && (
            <>
              <button
                className="border border-ink text-ink rounded-md py-1.5 text-sm disabled:opacity-50"
                disabled={busy === v.address}
                onClick={() => handlePresent(v.address)}
              >
                {busy === v.address ? "Presenting…" : "Present to merchant"}
              </button>

              <div className="flex gap-2">
                <input
                  placeholder="Recipient's address"
                  className="flex-1 border border-line rounded-md px-2 py-1 text-sm bg-transparent"
                  value={giftAddress[v.address] ?? ""}
                  onChange={(e) =>
                    setGiftAddress((prev) => ({ ...prev, [v.address]: e.target.value }))
                  }
                />
                <button
                  className="border border-line rounded-md px-3 text-sm disabled:opacity-50"
                  disabled={busy === v.address}
                  onClick={() => handleGift(v.address, giftAddress[v.address] ?? "")}
                >
                  {busy === v.address ? "Sending…" : "Gift"}
                </button>
              </div>
            </>
          )}

          {v.pendingRedemption && (
            <button
              className="border border-line rounded-md py-1.5 text-sm disabled:opacity-50"
              disabled={busy === v.address}
              onClick={() => handleCancel(v.address)}
            >
              {busy === v.address ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      ))}
      {error && <p className="text-stamp-red text-sm">{error}</p>}
    </div>
  );
}