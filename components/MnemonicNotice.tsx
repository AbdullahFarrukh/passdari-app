"use client";

import { Button } from "@/components/ui/Button";
import { KeyIcon } from "@/components/ui/icons";

// Shown once, right after signing up. The 12 words ARE the wallet: anyone who has them controls it,
// and they are the only way back in if the password is forgotten.
export function MnemonicNotice({ phrase, onDismiss }: { phrase: string; onDismiss: () => void }) {
  const words = phrase.trim().split(/\s+/);
  return (
    <section aria-labelledby="mnemonic-title" className="w-full max-w-6xl rounded-xl border-2 border-stamp-red bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stamp-red/10 text-stamp-red"><KeyIcon size={18} /></span>
        <div>
          <h2 id="mnemonic-title" className="font-semibold text-stamp-red">Write these 12 words down now</h2>
          <p className="mt-1 text-sm text-muted">
            This is the only time they will ever be shown. They are your wallet: anyone who has them controls it, and they are the only way to recover this account.
          </p>
        </div>
      </div>
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {words.map((w, i) => (
          <li key={i} className="flex items-baseline gap-2 rounded-lg border border-line bg-paper px-3 py-2 font-mono text-sm">
            <span className="w-5 text-right text-xs text-muted">{i + 1}</span>{w}
          </li>
        ))}
      </ol>
      <Button className="mt-4" variant="danger" onClick={onDismiss}>I&apos;ve written them down</Button>
    </section>
  );
}
