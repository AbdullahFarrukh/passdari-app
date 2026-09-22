"use client";

import { useState } from "react";
import { explorerAddressUrl, shortAddress } from "@/lib/explorer";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "./icons";

// Every object this app makes lives at a real address on Solana. This shows one: a label, the address,
// a button to copy it and a link to see it on Solana Explorer, so the on-chain side is visible, not hidden.
export function OnChainId({ address, label, full = false }: { address: string; label?: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Copying can be blocked (an old browser, or no permission). The address is still on screen to select.
    }
  }

  const what = label ?? "address";
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[10px] border-2 border-line bg-surface px-2 py-1">
      {label && <span className="eyebrow">{label}</span>}
      <code className={`font-mono text-xs text-charcoal ${full ? "break-all" : ""}`} title={address}>
        {full ? address : shortAddress(address)}
      </code>
      <span className="inline-flex items-center">
        <button type="button" onClick={copy} aria-label={`Copy ${what}`}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink">
          {copied ? <CheckIcon className="text-verified" /> : <CopyIcon />}
        </button>
        <a href={explorerAddressUrl(address)} target="_blank" rel="noopener noreferrer"
          aria-label={`View ${what} on Solana Explorer (opens in a new tab)`}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink">
          <ExternalLinkIcon />
        </a>
      </span>
      <span className="sr-only" role="status">{copied ? "Copied" : ""}</span>
    </span>
  );
}
