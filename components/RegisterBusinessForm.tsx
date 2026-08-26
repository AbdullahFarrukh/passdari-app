"use client";

import { useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { useProgram } from "@/lib/useProgram";

export function RegisterBusinessForm({ onDone }: { onDone: () => void }) {
  const wallet = useAnchorWallet();
  const program = useProgram();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [rewardLabel, setRewardLabel] = useState("");
  const [stampsRequired, setStampsRequired] = useState(10);
  const [minPurchasePkr, setMinPurchasePkr] = useState(1000);
  const [receiptMinutes, setReceiptMinutes] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!program || !wallet) return;

    setSubmitting(true);
    setError(null);

    try {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const minPurchaseMinorUnits = new BN(minPurchasePkr * 100);
      const receiptTtlSeconds = receiptMinutes * 60;

      await program.methods
        .registerBusiness(
          name,
          category,
          rewardLabel,
          stampsRequired,
          minPurchaseMinorUnits,
          "PKR",
          receiptTtlSeconds
        )
        .accounts({
          business: businessPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <input placeholder="Business name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Category (e.g. cafe)" value={category} onChange={(e) => setCategory(e.target.value)} required />
      <input placeholder="Reward label (e.g. Free coffee)" value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} required />
      <label>
        Stamps needed for a reward
        <input type="number" min={1} value={stampsRequired} onChange={(e) => setStampsRequired(Number(e.target.value))} />
      </label>
      <label>
        Minimum purchase (PKR)
        <input type="number" min={1} value={minPurchasePkr} onChange={(e) => setMinPurchasePkr(Number(e.target.value))} />
      </label>
      <label>
        Receipt valid for (minutes)
        <input type="number" min={1} value={receiptMinutes} onChange={(e) => setReceiptMinutes(Number(e.target.value))} />
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Registering..." : "Register business"}
      </button>
    </form>
  );
}