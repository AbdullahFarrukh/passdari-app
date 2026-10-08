"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { OnChainId } from "@/components/ui/OnChainId";
import { revealMnemonic as revealCustomer } from "@/lib/customerAuth";
import { revealMnemonic as revealMerchant } from "@/lib/merchantAuth";

// The quiet door out. Everything in Passdari already belongs to the person using it — the key is theirs,
// the cards and rewards are real tokens — but nothing in the app has ever said so out loud, so most people
// never find out. This says it in two lines and then gets out of the way.
//
// It stays collapsed on purpose. Someone who just wants a free coffee should never have to read it; someone
// curious enough to open it gets the whole thing, including the way to move this wallet somewhere else.
export function WalletGraduation({
  username,
  address,
  accountKind,
}: {
  username: string;
  address: string;
  accountKind: "customer" | "merchant";
}) {
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <details className="group mt-2" onToggle={(e) => { if (!(e.currentTarget as HTMLDetailsElement).open) hide(); }}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 px-1 py-1 font-mono text-xs uppercase tracking-wide text-muted hover:text-ink">
        <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span> Take this wallet with you
      </summary>

      <div className="mt-3 rounded-2xl border-2 border-line bg-surface p-5 shadow-[0_10px_24px_rgba(17,17,17,.14)]">
        <p className="max-w-2xl text-sm text-ink">
          This wallet is yours, not Passdari&apos;s. The same 12 words open it in Phantom, Solflare or any other
          Solana wallet — and your stamp cards and rewards are already inside it, waiting there.
        </p>

        <div className="mt-3">
          <OnChainId address={address} label="Your wallet" />
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
            <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {phrase.trim().split(/\s+/).map((w, i) => (
                <li key={i} className="flex items-baseline gap-2 rounded-lg border-2 border-ink px-2.5 py-2 font-mono text-sm">
                  <span className="w-4 text-right text-[10px] text-muted">{i + 1}</span>{w}
                </li>
              ))}
            </ol>
            <Button variant="outline" size="sm" className="mt-3" onClick={hide}>Hide them again</Button>
          </div>
        )}
      </div>
    </details>
  );
}
