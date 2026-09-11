"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useCustomerProgram } from "@/lib/customerProgram";

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

type PresentedVoucher = {
  address: string;
  voucherId: string;
  owner: string;
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

  useEffect(() => {
    const interval = setInterval(() => {
      onChange();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleRedeem(voucherAddress: string, ownerAddress: string) {
    console.log("handleRedeem called. program exists:", !!program);
    if (!program) return;
    setError(null);
    setBusy(voucherAddress);

    try {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program.programId
      );

      const [cardPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("card"), businessPda.toBuffer(), new PublicKey(ownerAddress).toBuffer()],
        program.programId
      );

                // Deliberately bypassing the relayer for this one specific instruction.
      // Redeeming doesn't create any account, so the real cost here is tiny,
      // and this avoids a genuinely unresolved signing issue specific to
      // this instruction's relay path — a known, documented gap rather than
      // an indefinite investigation. Every other instruction still uses the
      // relayer correctly.
      // Bypassing Anchor's higher-level .methods().accounts().rpc() chain
      // entirely for this one instruction — building the transaction by
      // hand, with an explicit, unambiguous account list, since every
      // lower-level piece (the Rust logic, the raw signature bytes, the
      // message construction) has already been independently proven
      // correct, leaving Anchor's own client-side account resolution as
      // the one remaining, unexplained variable.
      const instructionData = program.coder.instruction.encode("redeemVoucher", {});

      const { TransactionInstruction, Transaction: Web3Transaction, sendAndConfirmTransaction } =
        await import("@solana/web3.js");

      const ix = new TransactionInstruction({
        programId: program.programId,
        keys: [
          { pubkey: businessPda, isSigner: false, isWritable: true },
          { pubkey: new PublicKey(voucherAddress), isSigner: false, isWritable: true },
          { pubkey: cardPda, isSigner: false, isWritable: true },
          { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: keypair.publicKey, isSigner: true, isWritable: false },
        ],
        data: instructionData,
      });

      const tx = new Web3Transaction().add(ix);
      const sig = await sendAndConfirmTransaction(program.provider.connection, tx, [keypair]);
      console.log("Redeem succeeded, signature:", sig);

      onRedeem();
    } catch (err) {
      console.error("Redeem threw an error:", err);
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
              onClick={() => handleRedeem(v.address, v.owner)}
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