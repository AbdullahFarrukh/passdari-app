"use client";

import { useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type { Program } from "@anchor-lang/core";
import type { Loyalty } from "@/lib/loyalty";
import { translateError } from "@/lib/errorMessages";
import { Button } from "@/components/ui/Button";
import { Receipt } from "@/components/ui/Receipt";

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

// The terms of the reward, and only those. The shop's name and category are its identity, not its
// offer: the name is written into every card and voucher NFT when it is minted and never rewritten, so
// changing it would leave tokens in customers' wallets naming a shop that no longer calls itself that.
// Both are fixed at registration. Shut by default — these are the shop's terms, not something to
// adjust between customers.
export function EditBusinessForm({
  program,
  keypair,
  business,
  onSaved,
}: {
  program: Program<Loyalty> | null;
  keypair: Keypair;
  business: {
    name: string;
    rewardLabel: string;
    stampsRequired: number;
    minPurchaseAmount: BN | number;
    receiptTtlSeconds: number;
  };
  onSaved: () => void;
}) {
  const [rewardLabel, setRewardLabel] = useState(business.rewardLabel);
  const [stampsRequired, setStampsRequired] = useState(Number(business.stampsRequired));
  const [minPurchasePkr, setMinPurchasePkr] = useState(Number(business.minPurchaseAmount.toString()) / 100);
  const [receiptMinutes, setReceiptMinutes] = useState(Math.round(Number(business.receiptTtlSeconds) / 60));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!program) return;
    setError(null);
    setSaving(true);
    try {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .updateBusinessConfig(
          rewardLabel.trim(),
          stampsRequired,
          new BN(Math.round(minPurchasePkr * 100)),
          receiptMinutes * 60
        )
        .accounts({ business: businessPda, authority: keypair.publicKey } as any)
        .transaction();

      tx.feePayer = RELAYER_PUBLIC_KEY;
      const { blockhash } = await program.provider.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.partialSign(keypair);

      const res = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: tx.serialize({ requireAllSignatures: false }).toString("base64") }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSaved(true);
      onSaved();
    } catch (err) {
      setError(translateError(err));
    } finally {
      setSaving(false);
    }
  }

  const stampsChanged = stampsRequired !== Number(business.stampsRequired);

  return (
    <details className="group" onToggle={(e) => { if (!(e.currentTarget as HTMLDetailsElement).open) { setError(null); setSaved(false); } }}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 px-1 py-1 font-mono text-xs uppercase tracking-wide text-muted hover:text-ink">
        <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span> Change your reward
      </summary>

      <div className="mt-2">
        <Receipt className="px-5 pb-4 pt-5">
          <p className="text-sm text-muted">
            These are the terms new customers see. <b>{business.name}</b> and its category can&apos;t be
            changed — they are printed into every card and reward already in someone&apos;s wallet.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-reward" className="eyebrow">Reward label</label>
              <input id="edit-reward" className="field" maxLength={32} value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-stamps" className="eyebrow">Stamps needed for a reward</label>
              <input id="edit-stamps" type="number" min={1} max={100} className="field" value={stampsRequired}
                onChange={(e) => setStampsRequired(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-min" className="eyebrow">Minimum purchase (PKR)</label>
              <input id="edit-min" type="number" min={0} className="field" value={minPurchasePkr}
                onChange={(e) => setMinPurchasePkr(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-ttl" className="eyebrow">Code lasts (minutes)</label>
              <input id="edit-ttl" type="number" min={1} max={1440} className="field" value={receiptMinutes}
                onChange={(e) => setReceiptMinutes(Math.max(1, Math.min(1440, Number(e.target.value) || 1)))} />
            </div>
          </div>

          {stampsChanged && (
            <p className="mt-3 rounded-lg border-2 border-dashed border-stamp-blue bg-surface px-3 py-2 text-sm text-ink">
              Going from {Number(business.stampsRequired)} stamps to {stampsRequired} applies to cards started from
              now on. Anyone already collecting keeps the {Number(business.stampsRequired)} they began with, so
              nobody part-way through loses their progress.
            </p>
          )}
          {rewardLabel.trim() !== business.rewardLabel && (
            <p className="mt-3 rounded-lg border-2 border-dashed border-stamp-red bg-surface px-3 py-2 text-sm text-ink">
              Renaming the reward changes it for <b>everyone</b>, including customers part-way through a card.
              Someone collecting for &ldquo;{business.rewardLabel}&rdquo; will receive
              &ldquo;{rewardLabel.trim()}&rdquo; when they cash in. Rewards already claimed keep their old name.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} disabled={saving || !rewardLabel.trim()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && !error && <span className="text-sm font-medium text-ink" role="status">Saved.</span>}
          </div>
          {error && <p className="err mt-2" role="alert">{error}</p>}
        </Receipt>
      </div>
    </details>
  );
}
