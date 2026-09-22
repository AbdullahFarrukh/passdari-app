"use client";

import { Button } from "@/components/ui/Button";
import { KeyIcon } from "@/components/ui/icons";

// Shown once, right after signing up. The 12 words ARE the wallet: anyone who has them controls it,
// and they are the only way back in if the password is forgotten. Dashed red, not the receipt
// treatment — nothing here was "printed", it's a warning.
export function MnemonicNotice({ phrase, onDismiss }: { phrase: string; onDismiss: () => void }) {
  const words = phrase.trim().split(/\s+/);
  return (
    <section aria-labelledby="mnemonic-title"
      className="w-full max-w-6xl rounded-2xl border-[3px] border-dashed border-stamp-red bg-surface p-5 shadow-[0_10px_24px_rgba(17,17,17,.14)] sm:p-6">
      <div className="flex items-center gap-2.5 text-stamp-red">
        <KeyIcon size={24} />
        <h2 id="mnemonic-title" className="text-2xl sm:text-3xl">Write these 12 words down now</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-ink">
        This is the only time they will ever be shown. They are your wallet: anyone who has them controls it, and they are the only way to recover this account.
      </p>
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {words.map((w, i) => (
          <li key={i} className="flex items-baseline gap-2 rounded-lg border-2 border-ink px-2.5 py-2 font-mono text-sm">
            <span className="w-4 text-right text-[10px] text-muted">{i + 1}</span>{w}
          </li>
        ))}
      </ol>
      <Button className="mt-4" variant="danger" onClick={onDismiss}>I&apos;ve written them down</Button>
    </section>
  );
}
