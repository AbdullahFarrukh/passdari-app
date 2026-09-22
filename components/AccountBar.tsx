"use client";

import { Button } from "@/components/ui/Button";
import { KeyMark } from "@/components/ui/KeyMark";
import { OnChainId } from "@/components/ui/OnChainId";
import { Receipt } from "@/components/ui/Receipt";
import { WalletExplainer } from "@/components/WalletExplainer";

// Who is signed in: a picture made from the wallet address, the username, the address (copyable, with an
// Explorer link) and sign out. "About your wallet" explains what that address really is.
export function AccountBar({ username, address, onSignOut }: { username: string; address: string; onSignOut: () => void }) {
  return (
    <div className="w-full max-w-6xl">
      <Receipt className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <KeyMark address={address} size={44} />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs uppercase text-ink">Signed in as <span className="font-bold">{username}</span></p>
            <div className="mt-2"><OnChainId address={address} label="Wallet" /></div>
          </div>
          <Button variant="outline" size="sm" onClick={onSignOut}>Sign out</Button>
        </div>
      </Receipt>
      <details className="group mt-2">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 px-1 py-1 font-mono text-xs uppercase tracking-wide text-muted hover:text-ink">
          <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span> About your wallet
        </summary>
        <div className="mt-3"><WalletExplainer heading="This is a real Solana wallet, and only you hold the key" /></div>
      </details>
    </div>
  );
}
