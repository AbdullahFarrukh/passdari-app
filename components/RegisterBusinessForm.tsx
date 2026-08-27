"use client";

import { useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
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
          systemProgram: PublicKey.default,
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
      <p className="font-mono text-lg text-ink">Register your business</p>

      <input
        placeholder="Business name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="border border-line rounded-md px-3 py-2 bg-white/60"
      />
      <input
        placeholder="Category (e.g. cafe)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        required
        className="border border-line rounded-md px-3 py-2 bg-white/60"
      />
      <input
        placeholder="Reward label (e.g. Free coffee)"
        value={rewardLabel}
        onChange={(e) => setRewardLabel(e.target.value)}
        required
        className="border border-line rounded-md px-3 py-2 bg-white/60"
      />

      <label className="text-sm text-charcoal/70">
        Stamps needed for a reward
        <input
          type="number"
          min={1}
          value={stampsRequired}
          onChange={(e) => setStampsRequired(Number(e.target.value))}
          className="w-full border border-line rounded-md px-3 py-2 mt-1 bg-white/60 font-mono"
        />
      </label>

      <label className="text-sm text-charcoal/70">
        Minimum purchase (PKR)
        <input
          type="number"
          min={1}
          value={minPurchasePkr}
          onChange={(e) => setMinPurchasePkr(Number(e.target.value))}
          className="w-full border border-line rounded-md px-3 py-2 mt-1 bg-white/60 font-mono"
        />
      </label>

      <label className="text-sm text-charcoal/70">
        Receipt valid for (minutes)
        <input
          type="number"
          min={1}
          value={receiptMinutes}
          onChange={(e) => setReceiptMinutes(Number(e.target.value))}
          className="w-full border border-line rounded-md px-3 py-2 mt-1 bg-white/60 font-mono"
        />
      </label>

      {error && <p className="text-stamp-red text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-ink text-paper rounded-md py-2 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Registering…" : "Register business"}
      </button>
    </form>
  );
}