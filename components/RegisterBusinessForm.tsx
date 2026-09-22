"use client";

import { useState } from "react";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import BN from "bn.js";
import { useCustomerProgram } from "@/lib/customerProgram";
import { translateError } from "@/lib/errorMessages";
import { Button } from "@/components/ui/Button";
import { Receipt } from "@/components/ui/Receipt";

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

const WHAT_REGISTERING_DOES = [
  { title: "A permanent address", text: "Your business account has a fixed address derived from your wallet. Customers' cards point to it." },
  { title: "You stay in control", text: "Only your wallet can issue receipts and redeem vouchers. The rules you set here are stored on-chain." },
  { title: "No fees to you", text: "Passdari's relayer pays the network fee and the account's rent." },
];

export function RegisterBusinessForm({ keypair, onDone }: { keypair: Keypair; onDone: () => void }) {
  const program = useCustomerProgram(keypair);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [rewardLabel, setRewardLabel] = useState("");
  const [stampsRequired, setStampsRequired] = useState(10);
  const [minPurchasePkr, setMinPurchasePkr] = useState(1000);
  const [receiptMinutes, setReceiptMinutes] = useState(120);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!program) return;
    setSubmitting(true);
    setError(null);

    try {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program.programId
      );

      const minPurchaseMinorUnits = new BN(minPurchasePkr * 100);
      const receiptTtlSeconds = receiptMinutes * 60;

      const tx = await program.methods
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

      onDone();
        } catch (err) {
      setError(translateError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
      <Receipt className="px-6 pb-6 pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <h1 className="text-[2.5rem] leading-[0.98] text-ink">Register your business</h1>
            <p className="mt-1.5 text-sm text-muted">Tell customers what they are collecting stamps for.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="biz-name" className="eyebrow">Business name</label>
            <input id="biz-name" className="field" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="biz-category" className="eyebrow">Category</label>
            <input id="biz-category" className="field" placeholder="e.g. cafe" value={category} onChange={(e) => setCategory(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="biz-reward" className="eyebrow">Reward label</label>
            <input id="biz-reward" className="field" placeholder="e.g. Free coffee" value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="biz-stamps" className="eyebrow">Stamps needed for a reward</label>
            <input id="biz-stamps" type="number" min={1} className="field font-mono" value={stampsRequired} onChange={(e) => setStampsRequired(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="biz-min" className="eyebrow">Minimum purchase (PKR)</label>
            <input id="biz-min" type="number" min={1} className="field font-mono" value={minPurchasePkr} onChange={(e) => setMinPurchasePkr(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="biz-ttl" className="eyebrow">Receipt valid for (minutes)</label>
            <input id="biz-ttl" type="number" min={1} className="field font-mono" value={receiptMinutes} onChange={(e) => setReceiptMinutes(Number(e.target.value))} />
          </div>

          {error && <p role="alert" className="err">{error}</p>}
          <Button size="lg" type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Registering…" : "Register business"}
          </Button>
        </form>
      </Receipt>

      <aside aria-labelledby="register-explainer" className="h-fit">
        <Receipt className="px-6 pb-4 pt-5">
          <h2 id="register-explainer" className="text-balance text-[2rem] leading-[0.98] text-ink">Your business becomes an account on Solana</h2>
          <ul className="mt-4 flex flex-col gap-3.5">
            {WHAT_REGISTERING_DOES.map(({ title, text }, i) => (
              <li key={title}>
                <p className="font-mono text-xs font-bold uppercase text-ink">{i + 1}. {title}</p>
                <p className="mt-0.5 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </Receipt>
      </aside>
    </div>
  );
}
