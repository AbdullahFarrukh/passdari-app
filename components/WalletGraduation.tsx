"use client";

import { useEffect, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { Button } from "@/components/ui/Button";
import { OnChainId } from "@/components/ui/OnChainId";
import { ReceiptRow } from "@/components/ui/ReceiptRow";
import { useCustomerProgram } from "@/lib/customerProgram";
import { listWalletTokens, type WalletToken } from "@/lib/vouchers";
import { revealMnemonic as revealCustomer } from "@/lib/customerAuth";
import { revealMnemonic as revealMerchant } from "@/lib/merchantAuth";

// The quiet door out. Everything in Passdari already belongs to the person using it — the key is theirs,
// the cards and rewards are real tokens — but nothing else in the app says so out loud, so most people
// never find out.
//
// It stays collapsed on purpose. Someone who only wants a free coffee should never have to read it.
// Someone curious enough to open it gets the whole thing: proof of what they already own, the exact
// steps to open this same wallet somewhere else, and their 12 words behind their password.
export function WalletGraduation({
  keypair,
  username,
  address,
  accountKind,
}: {
  keypair: Keypair;
  username: string;
  address: string;
  accountKind: "customer" | "merchant";
}) {
  const program = useCustomerProgram(keypair);
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<WalletToken[] | null>(null);
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Only looked up once the panel is actually opened: it costs two RPC calls, and almost nobody opens it.
  useEffect(() => {
    if (!open || !program || tokens !== null) return;
    let cancelled = false;
    listWalletTokens(program.provider.connection, keypair.publicKey)
      .then((found) => { if (!cancelled) setTokens(found); })
      .catch((err) => {
        console.error("Could not read this wallet's tokens:", err);
        if (!cancelled) setTokens([]);
      });
    return () => { cancelled = true; };
  }, [open, program, keypair, tokens]);

  async function handleReveal() {
    setError(null);
    setBusy(true);
    try {
      const reveal = accountKind === "customer" ? revealCustomer : revealMerchant;
      setPhrase(await reveal(username, password));
      setPassword("");
    } catch {
      setError("That password didn't match this account.");
    } finally {
      setBusy(false);
    }
  }

  function hide() {
    setPhrase(null);
    setPassword("");
    setError(null);
  }

  return (
    <details
      className="group mt-2"
      onToggle={(e) => {
        const isOpen = (e.currentTarget as HTMLDetailsElement).open;
        setOpen(isOpen);
        if (!isOpen) hide();
      }}
    >
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 px-1 py-1 font-mono text-xs uppercase tracking-wide text-muted hover:text-ink">
        <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span> Take this wallet with you
      </summary>

      <div className="mt-3 rounded-2xl border-2 border-line bg-surface p-5 shadow-[0_10px_24px_rgba(17,17,17,.14)]">
        <p className="max-w-2xl text-sm text-ink">
          This wallet is yours, not Passdari&apos;s. The same 12 words open it in Phantom, Solflare or any
          other Solana wallet — and what you have collected is already inside it.
        </p>

        <div className="mt-3">
          <OnChainId address={address} label="Your wallet" />
        </div>

        {/* Proof beats explanation: the real contents, named, with a link to check each one. */}
        <div className="mt-4 border-t-2 border-line pt-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted">What is in it right now</p>
          {tokens === null ? (
            <p className="mt-2 text-sm text-muted">Looking…</p>
          ) : tokens.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing yet. Collect a stamp and your card shows up here as a real token you own.
            </p>
          ) : (
            <>
              <ul className="mt-2 flex flex-col gap-2">
                {tokens.map((t) => (
                  <li key={t.mint.toBase58()}>
                    <ReceiptRow
                      label={t.name}
                      value={t.soulbound ? "Stamp card" : "Reward"}
                    />
                    <div className="mt-1"><OnChainId address={t.mint.toBase58()} label="Token" /></div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-muted">
                {tokens.length === 1 ? "That is a real token" : `Those are ${tokens.length} real tokens`} on
                Solana, held by your wallet. Open it anywhere and they come with you.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 border-t-2 border-line pt-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted">Opening it somewhere else</p>
          <ol aria-label="How to open this wallet elsewhere" className="mt-2 flex flex-col gap-1.5 text-sm text-ink">
            <li>
              1. Install{" "}
              <a href="https://phantom.app/download" target="_blank" rel="noopener noreferrer"
                className="font-bold underline underline-offset-4">Phantom</a>{" "}or{" "}
              <a href="https://solflare.com/download" target="_blank" rel="noopener noreferrer"
                className="font-bold underline underline-offset-4">Solflare</a>.
            </li>
            <li>2. Choose <b>&ldquo;I already have a wallet&rdquo;</b>, not &ldquo;Create new&rdquo;.</li>
            <li>3. Type in the 12 words below. Your cards and rewards will be there.</li>
          </ol>
          {/* Worth saying plainly. The absence of a one-click button is the security feature. */}
          <p className="mt-3 text-sm text-muted">
            There is no one-click button for this, on purpose. A wallet that let a website hand it a
            recovery phrase would be a gift to scammers, so every real wallet makes you type the words in
            yourself.
          </p>
        </div>

        {!phrase && (
          <div className="mt-4 border-t-2 border-line pt-4">
            <label htmlFor="graduate-password" className="font-mono text-xs font-bold uppercase text-ink">
              Show my 12 words
            </label>
            <p className="mt-1 text-sm text-muted">Enter your password again to see them.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                id="graduate-password"
                type="password"
                className="field min-w-0 flex-1 sm:max-w-xs"
                value={password}
                autoComplete="current-password"
                placeholder="Your password"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && password) handleReveal(); }}
              />
              <Button onClick={handleReveal} disabled={!password || busy}>
                {busy ? "Checking…" : "Show"}
              </Button>
            </div>
            {error && <p className="err mt-2">{error}</p>}
          </div>
        )}

        {phrase && (
          <div className="mt-4 border-t-2 border-line pt-4">
            <p className="font-mono text-xs font-bold uppercase text-stamp-red">
              Anyone who sees these words owns this wallet
            </p>
            <ol aria-label="Your 12-word recovery phrase" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {phrase.trim().split(/\s+/).map((w, i) => (
                <li key={i} className="flex items-baseline gap-2 rounded-lg border-2 border-ink px-2.5 py-2 font-mono text-sm">
                  <span className="w-4 text-right text-[10px] text-muted">{i + 1}</span>{w}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-ink">
              Type them only into a wallet app you installed yourself, on its &ldquo;import a wallet&rdquo;
              screen. <b>Nobody from Passdari will ever ask you for them</b>, and no website should.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={hide}>Hide them again</Button>
          </div>
        )}
      </div>
    </details>
  );
}
