"use client";

import { useState, type FormEvent } from "react";
import { PublicKey } from "@solana/web3.js";
import { explorerAddressUrl } from "@/lib/explorer";
import { ExternalLinkIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";

// Lets a visitor paste any address the app has shown them — a card, a voucher, a receipt, a business —
// and open it straight on Solana Explorer. `new PublicKey` both parses and validates: a malformed
// address throws before anything opens, so a bad paste gets a clear error instead of a broken tab.
export function VerifyLookup() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Paste an address first.");
      return;
    }
    try {
      new PublicKey(trimmed);
    } catch {
      setError("That doesn't look like a Solana address.");
      return;
    }
    setError("");
    window.open(explorerAddressUrl(trimmed), "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={onSubmit} className="mt-1 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <label htmlFor="verify-address" className="sr-only">Card, voucher, receipt or business address</label>
        <input
          id="verify-address"
          className="field"
          placeholder="Paste a card, voucher, receipt or business address"
          value={value}
          onChange={(e) => { setValue(e.target.value); if (error) setError(""); }}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "verify-address-error" : undefined}
        />
        {error && (
          <p id="verify-address-error" role="alert" className="mt-1.5 font-mono text-xs text-stamp-red">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" variant="primary" size="md" className="shrink-0">
        <ExternalLinkIcon className="size-4" />
        View on Explorer
      </Button>
    </form>
  );
}
