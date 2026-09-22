"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useCustomerProgram } from "@/lib/customerProgram";
import { translateError } from "@/lib/errorMessages";
import { TOKEN_2022_PROGRAM_ID, findHolders } from "@/lib/vouchers";
import { Button } from "@/components/ui/Button";
import { OnChainId } from "@/components/ui/OnChainId";
import { Receipt } from "@/components/ui/Receipt";

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

type PresentedVoucher = {
  address: string;
  voucherId: string;
  mint: PublicKey;
  holder: string;
  holderToken: PublicKey;
  // Who paid for the voucher. Redeeming sends all its rent back there.
  rentPayer: PublicKey;
};

export function PresentedVouchers({
  keypair,
  refreshKey,
  onChange,
  onRedeem,
}: {
  keypair: Keypair;
  refreshKey: number;
  onChange: () => void;
  onRedeem: () => void;
}) {
  const program = useCustomerProgram(keypair);
  const [vouchers, setVouchers] = useState<PresentedVoucher[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program) return;

    async function load() {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program!.programId
      );

      const all = await program!.account.voucher.all([
        { memcmp: { offset: 8, bytes: businessPda.toBase58() } },
      ]);

      // "Presented" is a fact about the voucher's token: it's frozen while
      // its holder is showing it to a merchant. So look at whoever really
      // holds each voucher right now, not at the owner field on the voucher.
      const holders = await findHolders(
        program!.provider.connection,
        all.map((entry) => ({
          mint: entry.account.mint as PublicKey,
          ownerHint: entry.account.owner as PublicKey,
        }))
      );

      setVouchers(
        all.flatMap((entry, i) => {
          const holder = holders[i];
          if (!holder?.frozen) return [];
          return [
            {
              address: entry.publicKey.toBase58(),
              voucherId: (entry.account.voucherId as any).toString(),
              mint: entry.account.mint as PublicKey,
              holder: holder.owner.toBase58(),
              holderToken: holder.tokenAccount,
              rentPayer: entry.account.rentPayer as PublicKey,
            },
          ];
        })
      );
    }

    load();
  }, [program, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      onChange();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleRedeem(v: PresentedVoucher) {
    if (!program) return;
    setError(null);
    setBusy(v.address);

    try {
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), keypair.publicKey.toBuffer()],
        program.programId
      );

      // Redeeming burns the voucher's NFT, then closes it, the holder's token
      // account and the voucher record, sending their rent back to whoever
      // paid for them. No card is involved, so a voucher that was gifted to
      // someone with no card here redeems just the same.
      const tx = await program.methods
        .redeemVoucher()
        .accounts({
          business: businessPda,
          voucher: new PublicKey(v.address),
          mint: v.mint,
          holderToken: v.holderToken,
          authority: keypair.publicKey,
          relayer: RELAYER_PUBLIC_KEY,
          rentPayer: v.rentPayer,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
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
      if (data.error) throw new Error(data.error);

      onRedeem();
        } catch (err) {
      setError(translateError(err));
    } finally {
      setBusy(null);
    }
  }

  const count = vouchers?.length ?? 0;

  return (
    <Receipt className="px-5 pb-4 pt-4 sm:px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[2.125rem] leading-[0.98] text-ink">Presented vouchers</h2>
        {count > 0 && <span className="rounded-full bg-stamp-red px-2 py-0.5 font-mono text-xs text-white">{count}</span>}
      </div>

      {count === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing presented right now. When a customer presents a voucher, it appears here by itself.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {vouchers!.map((v) => (
            <li key={v.address} className="rounded-xl border-2 border-ink p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono font-semibold text-ink">Voucher #{v.voucherId}</p>
                  <p className="text-xs text-muted">Redeeming burns the NFT.</p>
                </div>
                <Button variant="danger" disabled={busy === v.address} onClick={() => handleRedeem(v)}>
                  {busy === v.address ? "Redeeming…" : "Redeem"}
                </Button>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <OnChainId label="Holder" address={v.holder} />
                <OnChainId label="NFT mint" address={v.mint.toBase58()} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="err mt-3">{error}</p>}
    </Receipt>
  );
}
