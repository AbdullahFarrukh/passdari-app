"use client";

import { useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { keccak256 } from "js-sha3";
import QRCode from "qrcode";
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
  const [secretHex, setSecretHex] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!program || !wallet) return;

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
        [Buffer.from("business"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const [receiptPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("receipt"), businessPda.toBuffer(), Buffer.from(secretHashBytes)],
        program.programId
      );

      await program.methods
        .issueReceipt(secretHashBytes, band)
        .accounts({
          business: businessPda,
          receipt: receiptPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

            const hex = Array.from(secretBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const combinedCode = `${wallet.publicKey.toBase58()}:${hex}`;
      const qrDataUrl = await QRCode.toDataURL(combinedCode);

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

      {qrImage && secretHex && (
        <div className="flex flex-col items-center gap-2 border rounded-lg p-4">
          <p className="text-sm text-green-700">Ready to scan</p>
          <img src={qrImage} alt="Receipt QR code" width={180} height={180} />
          <button type="button" onClick={handleCopy}>
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      )}
    </div>
  );
}