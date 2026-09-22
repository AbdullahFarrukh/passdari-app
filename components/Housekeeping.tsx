"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/Button";
import { Receipt } from "@/components/ui/Receipt";
import { PROGRAM_ID } from "@/lib/explorer";

// Three kinds of account hold rent nobody is coming back for: an expired receipt nobody claimed, a
// voucher nobody redeemed within 90 days, and a card's NFT after 90 days with no stamp. This panel shows
// how many of each this business currently has, and cleans them up — sending each one's rent back to
// whoever paid it, never to the merchant, who paid nothing for any of them. A daily job on the server
// does the same sweep across every business automatically; this button is just for whenever a merchant
// wants it done sooner.

type Counts = { receipts: number; vouchers: number; cardNfts: number };

function total(c: Counts | null): number {
  return c ? c.receipts + c.vouchers + c.cardNfts : 0;
}

export function Housekeeping({ keypair }: { keypair: Keypair }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [businessPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("business"), keypair.publicKey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );

  async function checkCounts() {
    try {
      const res = await fetch(`/api/cleanup?business=${businessPda.toBase58()}`);
      const data = await res.json();
      if (data.error) return;
      setCounts({ receipts: data.receipts.found, vouchers: data.vouchers.found, cardNfts: data.cardNfts.found });
    } catch {
      // A failed count check just leaves the panel hidden — the daily sweep still runs regardless.
    }
  }

  useEffect(() => {
    checkCounts();
    const interval = setInterval(checkCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleCleanup() {
    setWorking(true);
    setStatus(null);
    try {
      const res = await fetch("/api/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: businessPda.toBase58() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const closed = data.receipts.closed + data.vouchers.closed + data.cardNfts.closed;
      const found = data.receipts.found + data.vouchers.found + data.cardNfts.found;
      setStatus(`Cleaned up ${closed} of ${found} — rent refunded to whoever paid it.`);
      await checkCounts();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWorking(false);
    }
  }

  // Keep the panel up after a clean-up, so the merchant sees the result even though nothing is left.
  if (!total(counts) && !status) return null;

  const parts: string[] = [];
  if (counts?.receipts) parts.push(`${counts.receipts} expired receipt${counts.receipts === 1 ? "" : "s"}`);
  if (counts?.vouchers) parts.push(`${counts.vouchers} voucher${counts.vouchers === 1 ? "" : "s"} past their 90 days`);
  if (counts?.cardNfts) parts.push(`${counts.cardNfts} card NFT${counts.cardNfts === 1 ? "" : "s"} idle for 90 days`);

  return (
    <Receipt className="px-5 pb-4 pt-4 sm:px-6">
      <h2 className="text-[2.125rem] leading-[0.98] text-ink">Housekeeping</h2>
      {parts.length > 0 && (
        <p className="mt-2 text-sm text-muted">{parts.join(", ")} — still holding rent.</p>
      )}
      <Button variant="outline" size="sm" className="mt-3" onClick={handleCleanup} disabled={working}>
        {working ? "Cleaning up…" : "Clean up"}
      </Button>
      {status && <p className="mt-2 text-xs text-muted">{status}</p>}
      <p className="mt-2 text-xs text-muted">A daily job does this automatically too, so this is never required.</p>
    </Receipt>
  );
}
