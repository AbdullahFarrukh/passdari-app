"use client";

import { useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { keccak256 } from "js-sha3";
import { useProgram } from "@/lib/useProgram";

function computeAmountBand(amountMinor: number, minPurchase: number): number {
  if (amountMinor < minPurchase) return 0;
  if (amountMinor < minPurchase * 2) return 1;
  if (amountMinor <= minPurchase * 5) return 2;
  return 3;
}

export function NewSaleForm({
  minPurchaseMinor,
  onDone,
}: {
  minPurchaseMinor: number;
  onDone: () => void;
}) {
  const wallet = useAnchorWallet();
  const program = useProgram();
  const [amountPkr, setAmountPkr] = useState(1000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSecret, setLastSecret] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    console.log("Submit clicked. program:", program, "wallet:", wallet);
    if (!program || !wallet) return;

    const amountMinor = amountPkr * 100;
    const band = computeAmountBand(amountMinor, minPurchaseMinor);
    console.log("band:", band);

    if (band === 0) {
      setError("This amount is below the minimum purchase.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const secretHashBytes = keccak256.array(secretBytes);
      console.log("secret made, hash:", secretHashBytes);

      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), wallet.publicKey.toBuffer()],
        program.programId
      );
      console.log("businessPda:", businessPda.toBase58());

      const [receiptPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("receipt"), businessPda.toBuffer(), Buffer.from(secretHashBytes)],
        program.programId
      );
      console.log("receiptPda:", receiptPda.toBase58());

      console.log("about to call .rpc() -- watch for a Phantom popup now");

      await program.methods
        .issueReceipt(secretHashBytes, band)
        .accounts({
          business: businessPda,
          receipt: receiptPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("rpc() finished successfully");

      const secretHex = Array.from(secretBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setLastSecret(secretHex);
    } catch (err) {
      console.error("rpc() threw an error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      console.log("handleSubmit finally block ran");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label>
          Purchase amount (PKR)
          <input
            type="number"
            min={1}
            value={amountPkr}
            onChange={(e) => setAmountPkr(Number(e.target.value))}
          />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Issuing..." : "New sale"}
        </button>
      </form>
      {lastSecret && (
        <p className="text-xs break-all">
          Receipt issued. Secret (shown here only for testing — this won't stay visible once we build the QR code): {lastSecret}
        </p>
      )}
    </div>
  );
}