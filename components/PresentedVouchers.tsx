"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useCustomerProgram } from "@/lib/customerProgram";
import { translateError } from "@/lib/errorMessages";
import { TOKEN_2022_PROGRAM_ID, findHolders } from "@/lib/vouchers";

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

type PresentedVoucher = {
  address: string;
  voucherId: string;
  mint: PublicKey;
  holder: string;
  holderToken: PublicKey;
};

export function PresentedVouchers({
  keypair,
  refreshKey,
  onChange,
  onRedeem,
}: {
  keypair: Keypair;
  refreshKey: number;
  onChange: () => void;
  onRedeem: () => void;
}) {
  const program = useCustomerProgram(keypair);
  const [vouchers, setVouchers] = useState<PresentedVoucher[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program) return;

    async function load() {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program!.programId
      );

      const all = await program!.account.voucher.all([
        { memcmp: { offset: 8, bytes: businessPda.toBase58() } },
      ]);

      // "Presented" is a fact about the voucher's token: it's frozen while
      // its holder is showing it to a merchant. So look at whoever really
      // holds each voucher right now, not at the owner field on the voucher.
      const holders = await findHolders(
        program!.provider.connection,
        all.map((entry) => ({
          mint: entry.account.mint as PublicKey,
          ownerHint: entry.account.owner as PublicKey,
        }))
      );

      setVouchers(
        all.flatMap((entry, i) => {
          const holder = holders[i];
          if (!holder?.frozen) return [];
          return [
            {
              address: entry.publicKey.toBase58(),
              voucherId: (entry.account.voucherId as any).toString(),
              mint: entry.account.mint as PublicKey,
              holder: holder.owner.toBase58(),
              holderToken: holder.tokenAccount,
            },
          ];
        })
      );
    }

    load();
  }, [program, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      onChange();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleRedeem(v: PresentedVoucher) {
    if (!program) return;
    setError(null);
    setBusy(v.address);

    try {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program.programId
      );

      // Redeeming burns the voucher's NFT. No card is involved, so a voucher
      // that was gifted to someone with no card here redeems just the same.
      const tx = await program.methods
        .redeemVoucher()
        .accounts({
          business: businessPda,
          voucher: new PublicKey(v.address),
          mint: v.mint,
          holderToken: v.holderToken,
          authority: keypair.publicKey,
          relayer: RELAYER_PUBLIC_KEY,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        } as any)
        .transaction();

      tx.feePayer = RELAYER_PUBLIC_KEY;
      const { blockhash } = await program.provider.connection.getLatestBlockhash();
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

      onRedeem();
        } catch (err) {
      setError(translateError(err));
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
                {v.holder.slice(0, 4)}…{v.holder.slice(-4)}
              </p>
            </div>
            <button
              disabled={busy === v.address}
              onClick={() => handleRedeem(v)}
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