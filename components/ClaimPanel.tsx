"use client";

import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/Button";
import { OnChainId } from "@/components/ui/OnChainId";
import { Receipt } from "@/components/ui/Receipt";
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
    <Receipt className="px-5 pb-4 pt-5 sm:px-6">
      <h2 className="text-3xl text-ink">Claim a stamp</h2>
      <p className="mt-1.5 text-sm text-muted">Scan the QR code on the merchant&apos;s screen, or paste the code they share.</p>
      <Button size="lg" className="mt-4 w-full" onClick={p.onToggleScanner}>
        <QrIcon size={20} /> {p.showScanner ? "Hide scanner" : "Scan to claim"}
      </Button>
      {p.showScanner && <div className="mt-3"><QrScanner onScan={p.onScan} /></div>}
      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="claim-code" className="eyebrow">Code</label>
        <input id="claim-code" className="field font-mono text-sm" placeholder="Paste the merchant's code"
          value={p.code} onChange={(e) => p.onCode(e.target.value)} />
      </div>
      {merchant && <div className="mt-2"><OnChainId label="From merchant" address={merchant} /></div>}
      {p.expiresInfo && <p className="mt-2 flex items-center gap-1.5 font-mono text-xs text-ink"><ClockIcon size={16} /> {p.expiresInfo}</p>}
      {p.error && <p role="alert" className="err mt-3">{p.error}</p>}
      <Button size="lg" className="mt-4 w-full" onClick={p.onClaim}>Claim stamp</Button>
    </Receipt>
  );
}
