"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import type { Program } from "@anchor-lang/core";
import type { Loyalty } from "@/lib/loyalty";
import { translateError } from "@/lib/errorMessages";
import { Button } from "@/components/ui/Button";
import { shortAddress } from "@/lib/explorer";

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

// Someone three stamps short of a free coffee, and a friend with three spare. Stamps can only move
// between cards at the same shop — a stamp is a debt that shop owes, and the program refuses to let it
// land anywhere else.
//
// The recipient is identified by their WALLET address, not their card address. That is the thing they can
// actually copy off their own screen, and it means this side can work out their card and check it exists
// before anything is sent. Without that check the program's own refusal ("AccountNotInitialized") reaches
// the app as a message about used codes, which would make no sense here.

type Recipient =
  | { state: "empty" }
  | { state: "checking" }
  | { state: "bad-address" }
  | { state: "self" }
  | { state: "no-card" }
  | { state: "ready"; card: PublicKey; name: string | null; stamps: number };

export function TransferStamps({
  program,
  keypair,
  businessAddress,
  businessName,
  fromCard,
  availableStamps,
  onDone,
}: {
  program: Program<Loyalty> | null;
  keypair: Keypair;
  businessAddress: PublicKey;
  businessName: string;
  fromCard: string;
  availableStamps: number;
  onDone: () => void;
}) {
  const [recipientInput, setRecipientInput] = useState("");
  const [amount, setAmount] = useState(1);
  const [recipient, setRecipient] = useState<Recipient>({ state: "empty" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  // Look the friend up as they type, so the answer is on screen before they commit to anything.
  useEffect(() => {
    const typed = recipientInput.trim();
    if (!typed) {
      setRecipient({ state: "empty" });
      return;
    }
    if (!program) return;

    let cancelled = false;
    setRecipient({ state: "checking" });

    const timer = setTimeout(async () => {
      let wallet: PublicKey;
      try {
        wallet = new PublicKey(typed);
      } catch {
        if (!cancelled) setRecipient({ state: "bad-address" });
        return;
      }

      if (wallet.equals(keypair.publicKey)) {
        if (!cancelled) setRecipient({ state: "self" });
        return;
      }

      try {
        const [theirCard] = PublicKey.findProgramAddressSync(
          [Buffer.from("card"), businessAddress.toBuffer(), wallet.toBuffer()],
          program.programId
        );
        const card = await program.account.loyaltyCard.fetchNullable(theirCard);
        if (cancelled) return;
        if (!card) {
          setRecipient({ state: "no-card" });
          return;
        }

        // A name is only a nicety, so a failed lookup still leaves a usable screen.
        let name: string | null = null;
        try {
          const res = await fetch(`/api/customer-name?addresses=${wallet.toBase58()}`);
          if (res.ok) name = (await res.json())?.names?.[wallet.toBase58()] ?? null;
        } catch {
          // keep name null
        }

        if (!cancelled) {
          setRecipient({ state: "ready", card: theirCard, name, stamps: card.stamps as number });
        }
      } catch (err) {
        console.error("Could not look up that card:", err);
        if (!cancelled) setRecipient({ state: "no-card" });
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [recipientInput, program, businessAddress, keypair]);

  async function handleSend() {
    if (!program || recipient.state !== "ready") return;
    setError(null);
    setSending(true);
    try {
      const tx = await program.methods
        .transferStamps(amount)
        .accounts({
          business: businessAddress,
          fromCard: new PublicKey(fromCard),
          toCard: recipient.card,
          customer: keypair.publicKey,
          relayer: RELAYER_PUBLIC_KEY,
        } as any)
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

      const who = recipient.name ?? shortAddress(recipientInput.trim());
      setSent(`${amount} ${amount === 1 ? "stamp" : "stamps"} sent to ${who}.`);
      setRecipientInput("");
      setAmount(1);
      setRecipient({ state: "empty" });
      onDone();
    } catch (err) {
      setError(translateError(err, "transfer"));
    } finally {
      setSending(false);
    }
  }

  if (availableStamps < 1) return null;

  const canSend =
    recipient.state === "ready" && amount >= 1 && amount <= availableStamps && !sending;

  return (
    <details className="group" onToggle={(e) => { if (!(e.currentTarget as HTMLDetailsElement).open) { setError(null); setSent(null); } }}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 px-1 py-1 font-mono text-xs uppercase tracking-wide text-muted hover:text-ink">
        <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span> Send stamps to a friend
      </summary>

      <div className="mt-2 rounded-xl border-2 border-line bg-surface p-4">
        <p className="text-sm text-muted">
          Stamps can only go to someone who already has a card at {businessName}. They leave your card when you send them.
        </p>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:w-28">
            <label htmlFor={`amount-${fromCard}`} className="eyebrow">How many</label>
            <input
              id={`amount-${fromCard}`}
              type="number"
              min={1}
              max={availableStamps}
              className="field"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Math.min(availableStamps, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={`to-${fromCard}`} className="eyebrow">Their wallet address</label>
            <input
              id={`to-${fromCard}`}
              className="field font-mono text-sm"
              placeholder="Paste your friend's wallet address"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
            />
          </div>
        </div>

        <p className="mt-2 text-sm" role="status">
          {recipient.state === "checking" && <span className="text-muted">Looking them up…</span>}
          {recipient.state === "bad-address" && <span className="text-muted">That doesn&apos;t look like a wallet address yet.</span>}
          {recipient.state === "self" && <span className="text-muted">That&apos;s your own wallet.</span>}
          {recipient.state === "no-card" && (
            <span className="text-muted">
              Nobody at that address has a card at {businessName} yet — they need to collect one stamp here first.
            </span>
          )}
          {recipient.state === "ready" && (
            <span className="font-medium text-ink">
              {recipient.name ?? shortAddress(recipientInput.trim())} has a card here with {recipient.stamps}{" "}
              {recipient.stamps === 1 ? "stamp" : "stamps"}.
            </span>
          )}
        </p>

        <Button className="mt-3" disabled={!canSend} onClick={handleSend}>
          {sending ? "Sending…" : `Send ${amount} ${amount === 1 ? "stamp" : "stamps"}`}
        </Button>

        {sent && <p className="mt-2 text-sm font-medium text-ink" role="status">{sent}</p>}
        {error && <p className="err mt-2" role="alert">{error}</p>}
      </div>
    </details>
  );
}
