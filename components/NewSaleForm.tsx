"use client";

import { useState } from "react";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { keccak256 } from "js-sha3";
import QRCode from "qrcode";
import { useCustomerProgram } from "@/lib/customerProgram";
import { Button } from "@/components/ui/Button";
import { OnChainId } from "@/components/ui/OnChainId";
import { Receipt } from "@/components/ui/Receipt";
import { CheckIcon } from "@/components/ui/icons";

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
  ttlSeconds,
  onDone,
}: {
  keypair: Keypair;
  minPurchaseMinor: number;
  ttlSeconds: number;
  onDone: () => void;
}) {
  const program = useCustomerProgram(keypair);
  const [amountPkr, setAmountPkr] = useState(1000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secretHex, setSecretHex] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [receiptAddress, setReceiptAddress] = useState<string | null>(null);
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
    setReceiptAddress(null);
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
        color: { dark: "#111111", light: "#FFFFFF" },
      });

      setSecretHex(combinedCode);
      setQrImage(qrDataUrl);
      setReceiptAddress(receiptPda.toBase58());
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

  const validFor = ttlSeconds < 3600 ? `${Math.round(ttlSeconds / 60)} minutes` : `${Math.round(ttlSeconds / 3600)} hours`;

  return (
    <Receipt className="px-5 pb-4 pt-4 sm:px-6">
      <h2 className="text-[2.125rem] leading-[0.98] text-ink">New sale</h2>
      <p className="mt-1 text-sm text-muted">Enter the purchase amount to create a one-time receipt the customer can scan.</p>
      <form onSubmit={handleSubmit} className="mt-3.5 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sale-amount" className="eyebrow">Purchase amount (PKR)</label>
          <input id="sale-amount" type="number" min={1} className="field font-mono" value={amountPkr} onChange={(e) => setAmountPkr(Number(e.target.value))} />
        </div>
        {error && <p role="alert" className="err">{error}</p>}
        <Button size="lg" type="submit" className="w-full" disabled={submitting}>{submitting ? "Issuing…" : "New sale"}</Button>
      </form>

      {qrImage && secretHex && (
        <div className="mt-5 flex flex-col items-center gap-3 border-t-2 border-dashed border-ink pt-4">
          <p className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-stamp-blue"><CheckIcon size={16} /> Ready to scan</p>
          <div className="border-[3px] border-ink bg-surface p-2">
            <img src={qrImage} alt="Receipt QR code" width={180} height={180} className="block" />
          </div>
          <p className="text-center text-xs text-muted">Valid for {validFor}. It can be claimed once. Or share the code instead.</p>
          <Button variant="outline" size="sm" onClick={handleCopy}>{copied ? "Copied" : "Copy code"}</Button>
          {receiptAddress && <OnChainId label="Receipt" address={receiptAddress} />}
        </div>
      )}
    </Receipt>
  );
}
