"use client";

import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/Button";
import { OnChainId } from "@/components/ui/OnChainId";
import { ClockIcon, QrIcon } from "@/components/ui/icons";
import { QrScanner } from "@/components/QrScanner";

type Props = {
  code: string; onCode: (v: string) => void;
  expiresInfo: string | null;
  onClaim: () => void; error: string | null;
  showScanner: boolean; onToggleScanner: () => void; onScan: (text: string) => void;
};

// A merchant's code looks like "<the merchant's wallet>:<secret>". Once one is pasted or scanned, show which
// merchant it is from, as an address that can be checked on Solana Explorer, before the customer claims it.
function merchantOf(code: string): string | null {
  if (!code.includes(":")) return null;
  try {
    return new PublicKey(code.split(":")[0]).toBase58();
  } catch {
    return null;
  }
}

export function ClaimPanel(p: Props) {
  const merchant = merchantOf(p.code);
  return (
    <section aria-labelledby="claim-title" className="surface p-4 sm:p-5">
      <h2 id="claim-title" className="eyebrow">Claim a stamp</h2>
      <p className="mt-1 text-sm text-muted">Scan the QR code on the merchant&apos;s screen, or paste the code they share.</p>
      <Button className="mt-4 w-full" onClick={p.onToggleScanner}>
        <QrIcon size={18} /> {p.showScanner ? "Hide scanner" : "Scan to claim"}
      </Button>
      {p.showScanner && <div className="mt-3"><QrScanner onScan={p.onScan} /></div>}
      <label htmlFor="claim-code" className="eyebrow mt-4 block">Code</label>
      <input id="claim-code" className="field mt-1.5 font-mono text-sm" placeholder="Paste the merchant's code"
        value={p.code} onChange={(e) => p.onCode(e.target.value)} />
      {merchant && <div className="mt-2"><OnChainId label="From merchant" address={merchant} /></div>}
      {p.expiresInfo && <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><ClockIcon /> {p.expiresInfo}</p>}
      <Button variant="danger" className="mt-4 w-full" onClick={p.onClaim}>Claim stamp</Button>
      {p.error && <p role="alert" className="mt-2 text-sm text-stamp-red">{p.error}</p>}
    </section>
  );
}
