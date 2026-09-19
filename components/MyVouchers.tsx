"use client";

import { useEffect, useState } from "react";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { useCustomerProgram } from "@/lib/customerProgram";
import { translateError } from "@/lib/errorMessages";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  VOUCHER_MINT_OFFSET,
  listHeldNfts,
  tokenAccountFor,
} from "@/lib/vouchers";

type VoucherEntry = {
  address: string;
  voucherId: string;
  mint: PublicKey;
  holderToken: PublicKey;
  presented: boolean;
};

export function MyVouchers({
  keypair,
  refreshKey,
  onChange,
  onCount,
}: {
  keypair: Keypair;
  refreshKey: number;
  onChange: () => void;
  onCount?: (count: number) => void;
}) {
  const program = useCustomerProgram(keypair);
  const [vouchers, setVouchers] = useState<VoucherEntry[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [giftAddress, setGiftAddress] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!program) return;

    async function load() {
      // A voucher belongs to whoever holds its token, so start from the
      // tokens this wallet holds — not from the owner field on the voucher,
      // which goes stale if the NFT is moved from outside this app.
      const held = await listHeldNfts(program!.provider.connection, keypair.publicKey);

      // Anyone can send any NFT to any wallet, so keep only the ones that
      // really are our vouchers.
      const matched = await Promise.all(
        held.map(async (nft) => {
          const vouchers = await program!.account.voucher.all([
            { memcmp: { offset: VOUCHER_MINT_OFFSET, bytes: nft.mint.toBase58() } },
          ]);
          return vouchers.map((entry) => ({ entry, nft }));
        })
      );

      const mapped = matched.flat().map(({ entry, nft }) => ({
        address: entry.publicKey.toBase58(),
        voucherId: (entry.account.voucherId as any).toString(),
        mint: nft.mint,
        holderToken: nft.tokenAccount,
        presented: nft.frozen,
      }));

      setVouchers(mapped);
      onCount?.(mapped.length);
    }

    load();
  }, [program, refreshKey]);

  const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

  async function relaySign(tx: any) {
    tx.feePayer = RELAYER_PUBLIC_KEY;
    const { blockhash } = await program!.provider.connection.getLatestBlockhash();
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
  }

  async function handlePresent(v: VoucherEntry) {
    if (!program) return;
    setError(null);
    setBusy(v.address);

    try {
      const tx = await program.methods
        .presentVoucher()
        .accounts({
          voucher: new PublicKey(v.address),
          mint: v.mint,
          holderToken: v.holderToken,
          owner: keypair.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        } as any)
        .transaction();

      await relaySign(tx);
      onChange();
    } catch (err) {
            setError(translateError(err));
    } finally {
      setBusy(null);
    }
  }

    async function handleCancel(v: VoucherEntry) {
    if (!program) return;
    setError(null);
    setBusy(v.address);

    try {
      const tx = await program.methods
        .cancelPresentation()
        .accounts({
          voucher: new PublicKey(v.address),
          mint: v.mint,
          holderToken: v.holderToken,
          owner: keypair.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        } as any)
        .transaction();

      await relaySign(tx);
      onChange();
    } catch (err) {
            setError(translateError(err));
    } finally {
      setBusy(null);
    }
  }

    async function handleGift(v: VoucherEntry, recipient: string) {
    if (!program) return;
    setError(null);
    setBusy(v.address);

    try {
      const newOwner = new PublicKey(recipient);
      // This moves the actual NFT. If the recipient has never held this
      // token, the program creates their token account and the relayer pays
      // for it, so they don't need any SOL to receive a gift.
      const tx = await program.methods
        .transferVoucher()
        .accounts({
          voucher: new PublicKey(v.address),
          mint: v.mint,
          fromToken: v.holderToken,
          toToken: tokenAccountFor(newOwner, v.mint),
          newOwner,
          owner: keypair.publicKey,
          relayer: RELAYER_PUBLIC_KEY,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .transaction();

      await relaySign(tx);
      onChange();
    } catch (err) {
            setError(translateError(err));
    } finally {
      setBusy(null);
    }
  }

  if (vouchers === null) return null;
  if (vouchers.length === 0) {
    return <p className="text-sm text-charcoal/60">No vouchers yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <p className="font-mono text-xs uppercase tracking-wider text-charcoal/60">My vouchers</p>
      {vouchers.map((v) => (
        <div
          key={v.address}
          className="border border-line rounded-lg p-3 text-sm flex flex-col gap-2 bg-white/60"
        >
          <div className="flex justify-between items-baseline">
            <span className="font-mono font-medium text-ink">Voucher #{v.voucherId}</span>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                v.presented
                  ? "bg-stamp-red/10 text-stamp-red"
                  : "bg-quiet-green/10 text-quiet-green"
              }`}
            >
              {v.presented ? "Presented" : "Ready"}
            </span>
          </div>

          {!v.presented && (
            <>
              <button
                className="border border-ink text-ink rounded-md py-1.5 text-sm disabled:opacity-50"
                disabled={busy === v.address}
                onClick={() => handlePresent(v)}
              >
                {busy === v.address ? "Presenting…" : "Present to merchant"}
              </button>

              <div className="flex gap-2">
                <input
                  placeholder="Recipient's address"
                  className="flex-1 border border-line rounded-md px-2 py-1 text-sm bg-transparent"
                  value={giftAddress[v.address] ?? ""}
                  onChange={(e) =>
                    setGiftAddress((prev) => ({ ...prev, [v.address]: e.target.value }))
                  }
                />
                <button
                  className="border border-line rounded-md px-3 text-sm disabled:opacity-50"
                  disabled={busy === v.address}
                  onClick={() => handleGift(v, giftAddress[v.address] ?? "")}
                >
                  {busy === v.address ? "Sending…" : "Gift"}
                </button>
              </div>
            </>
          )}

          {v.presented && (
            <button
              className="border border-line rounded-md py-1.5 text-sm disabled:opacity-50"
              disabled={busy === v.address}
              onClick={() => handleCancel(v)}
            >
              {busy === v.address ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      ))}
      {error && <p className="text-stamp-red text-sm">{error}</p>}
    </div>
  );
}