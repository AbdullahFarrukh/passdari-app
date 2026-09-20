"use client";

import { Button } from "@/components/ui/Button";
import { KeyMark } from "@/components/ui/KeyMark";
import { OnChainId } from "@/components/ui/OnChainId";
import { WalletExplainer } from "@/components/WalletExplainer";

// Who is signed in: a picture made from the wallet address, the username, the address (copyable, with an
// Explorer link) and sign out. "About your wallet" explains what that address really is.
export function AccountBar({ username, address, onSignOut }: { username: string; address: string; onSignOut: () => void }) {
  return (
    <div className="w-full max-w-6xl">
      <div className="surface flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:p-4">
        <KeyMark address={address} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Signed in as <span className="font-semibold text-ink">{username}</span></p>
          <div className="mt-1"><OnChainId address={address} label="Wallet" /></div>
        </div>
        <Button variant="outline" size="sm" onClick={onSignOut}>Sign out</Button>
      </div>
      <details className="group mt-2">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-1 py-1 text-sm text-muted hover:text-ink">
          <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span> About your wallet
        </summary>
        <div className="mt-2"><WalletExplainer heading="This is a real Solana wallet, and only you hold the key" /></div>
      </details>
    </div>
  );
}
