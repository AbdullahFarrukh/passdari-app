"use client";

import { useEffect, useState } from "react";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { useCustomerProgram } from "@/lib/customerProgram";

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");
const CLOCK_SYSVAR = new PublicKey("SysvarC1ock11111111111111111111111111111111");

async function getOnChainNow(connection: Connection): Promise<number> {
  const accountInfo = await connection.getAccountInfo(CLOCK_SYSVAR);
  if (!accountInfo) throw new Error("Could not read the on-chain clock");
  // The Clock sysvar's unix_timestamp is an i64, little-endian, at byte offset 32.
  return Number(accountInfo.data.readBigInt64LE(32));
}

export function ReclaimExpiredReceipts({ keypair }: { keypair: Keypair }) {
  const program = useCustomerProgram(keypair);
  const [expiredCount, setExpiredCount] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function checkExpired() {
    if (!program) return;

    const [businessPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("business"), keypair.publicKey.toBuffer()],
      program.programId
    );

    const [all, onChainNow] = await Promise.all([
      program.account.receipt.all([
        { memcmp: { offset: 8, bytes: businessPda.toBase58() } },
      ]),
      getOnChainNow(program.provider.connection),
    ]);

    const expired = all.filter(
      (entry) => Number((entry.account.expiresAt as any).toString()) <= onChainNow
    );
    setExpiredCount(expired.length);
  }

  useEffect(() => {
    checkExpired();
  }, [program]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkExpired();
    }, 5000);
    return () => clearInterval(interval);
  }, [program]);

  async function handleReclaim() {
    if (!program) return;
    setWorking(true);
    setStatus(null);

    try {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program.programId
      );

      const [all, onChainNow] = await Promise.all([
        program.account.receipt.all([
          { memcmp: { offset: 8, bytes: businessPda.toBase58() } },
        ]),
        getOnChainNow(program.provider.connection),
      ]);

      const expired = all.filter(
        (entry) => Number((entry.account.expiresAt as any).toString()) <= onChainNow
      );

      let reclaimedCount = 0;

      for (const entry of expired) {
        try {
          const tx = await program.methods
            .reclaimExpiredReceipt()
            .accounts({
              receipt: entry.publicKey,
              business: businessPda,
              authority: keypair.publicKey,
              relayer: RELAYER_PUBLIC_KEY,
            } as any)
            .transaction();

          tx.feePayer = RELAYER_PUBLIC_KEY;
          const { blockhash } = await program.provider.connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.partialSign(keypair);

          const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");
          const res = await fetch("/api/relay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transaction: serialized }),
          });
          const data = await res.json();

          if (!data.error) {
            reclaimedCount++;
          } else {
            console.error("Reclaim failed for", entry.publicKey.toBase58(), ":", data.error);
          }
        } catch (err) {
          console.error("Reclaim attempt threw for", entry.publicKey.toBase58(), ":", err);
        }
      }

      setStatus(`Reclaimed ${reclaimedCount} of ${expired.length} expired receipts — rent refunded to the relayer.`);
      await checkExpired();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWorking(false);
    }
  }

  if (!expiredCount) return null;

  return (
    <div className="w-full max-w-sm flex flex-col gap-2 border border-line rounded-lg p-3 bg-white/60">
      <p className="text-sm text-charcoal/70">
        {expiredCount} expired receipt{expiredCount === 1 ? "" : "s"} still holding rent.
      </p>
      <button
        onClick={handleReclaim}
        disabled={working}
        className="border border-ink text-ink rounded-md py-1.5 text-sm disabled:opacity-50"
      >
        {working ? "Reclaiming…" : "Clean up expired receipts"}
      </button>
      {status && <p className="text-xs text-charcoal/60">{status}</p>}
    </div>
  );
}