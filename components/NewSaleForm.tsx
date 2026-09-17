"use client";

import { useState } from "react";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { keccak256 } from "js-sha3";
import QRCode from "qrcode";
import { useCustomerProgram } from "@/lib/customerProgram";

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

function computeAmountBand(amountMinor: number, minPurchase: number): number {
  if (amountMinor < minPurchase) return 0;
  if (amountMinor < minPurchase * 2) return 1;
  if (amountMinor <= minPurchase * 5) return 2;
  return 3;
}

export function NewSaleForm({
  keypair,
  minPurchaseMinor,
  onDone,
}: {
  keypair: Keypair;
  minPurchaseMinor: number;
  onDone: () => void;
}) {
  const program = useCustomerProgram(keypair);
  const [amountPkr, setAmountPkr] = useState(1000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secretHex, setSecretHex] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!program) return;

    const amountMinor = amountPkr * 100;
    const band = computeAmountBand(amountMinor, minPurchaseMinor);

    if (band === 0) {
      setError("This amount is below the minimum purchase.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSecretHex(null);
    setQrImage(null);
    setCopied(false);

    try {
      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const secretHashBytes = keccak256.array(secretBytes);

      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program.programId
      );

      const [receiptPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("receipt"), businessPda.toBuffer(), Buffer.from(secretHashBytes)],
        program.programId
      );

      const tx = await program.methods
        .issueReceipt(secretHashBytes, band)
        .accounts({
          business: businessPda,
          receipt: receiptPda,
          authority: keypair.publicKey,
          relayer: RELAYER_PUBLIC_KEY,
          systemProgram: SystemProgram.programId,
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

      const hex = Array.from(secretBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const combinedCode = `${keypair.publicKey.toBase58()}:${hex}`;
      const qrDataUrl = await QRCode.toDataURL(combinedCode, {
        color: { dark: "#2A2724", light: "#EDE6D6" },
      });

      setSecretHex(combinedCode);
      setQrImage(qrDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!secretHex) return;
    await navigator.clipboard.writeText(secretHex);
    setCopied(true);
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-charcoal/70">
          Purchase amount (PKR)
          <input
            type="number"
            min={1}
            value={amountPkr}
            onChange={(e) => setAmountPkr(Number(e.target.value))}
            className="w-full border border-line rounded-md px-3 py-2 mt-1 bg-white/60 font-mono"
          />
        </label>
        {error && <p className="text-stamp-red text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ink text-paper rounded-md py-2 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Issuing…" : "New sale"}
        </button>
      </form>

      {qrImage && secretHex && (
        <div className="flex flex-col items-center gap-3 border border-line rounded-lg p-4 bg-white/60">
          <p className="text-sm text-quiet-green flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Ready to scan
          </p>
          <img
            src={qrImage}
            alt="Receipt QR code"
            width={180}
            height={180}
            className="rounded-md border border-line"
          />
          <p className="text-xs text-charcoal/50">Or share the code below</p>
          <button
            type="button"
            onClick={handleCopy}
            className="border border-ink text-ink rounded-md px-4 py-1.5 text-sm"
          >
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      )}
    </div>
  );
}