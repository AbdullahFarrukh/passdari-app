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
import { Button } from "@/components/ui/Button";
import { OnChainId } from "@/components/ui/OnChainId";
import { TicketIcon } from "@/components/ui/icons";

type VoucherEntry = {
  address: string;
  voucherId: string;
  mint: PublicKey;
  holderToken: PublicKey;
  presented: boolean;
  businessName: string;
  rewardLabel: string;
  mintedAt: number;
  expiresAt: number;
  // Who paid for the voucher. Rent from its accounts goes back there.
  rentPayer: PublicKey;
};

// While a voucher is presented, its holder is waiting for the merchant to redeem it, so the list refreshes by
// itself. Once it is redeemed the NFT is burned and the ticket disappears without anyone having to reload.
const REFRESH_WHILE_PRESENTED_MS = 5000;

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
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!program) return;
    let cancelled = false;

    async function load() {
      // A voucher belongs to whoever holds its token, so start from the
      // tokens this wallet holds — not from the owner field on the voucher,
      // which goes stale if the NFT is moved from outside this app.
      const held = await listHeldNfts(program!.provider.connection, keypair.publicKey);

      // Anyone can send any NFT to any wallet, so keep only the ones that
      // really are our vouchers.
      const matched = await Promise.all(
        held.map(async (nft) => {
          const found = await program!.account.voucher.all([
            { memcmp: { offset: VOUCHER_MINT_OFFSET, bytes: nft.mint.toBase58() } },
          ]);
          return found.map((entry) => ({ entry, nft }));
        })
      );
      const found = matched.flat();

      // The ticket names the reward and the business, so look each business up once.
      const businessKeys = [...new Set(found.map(({ entry }) => (entry.account.business as PublicKey).toBase58()))];
      const businesses = new Map<string, { name: string; rewardLabel: string }>();
      await Promise.all(
        businessKeys.map(async (key) => {
          try {
            const business = await program!.account.business.fetch(new PublicKey(key));
            businesses.set(key, { name: business.name as string, rewardLabel: business.rewardLabel as string });
          } catch {
            // A ticket without a business name is still a valid voucher.
          }
        })
      );

      const mapped = found.map(({ entry, nft }) => {
        const business = businesses.get((entry.account.business as PublicKey).toBase58());
        return {
          address: entry.publicKey.toBase58(),
          voucherId: (entry.account.voucherId as { toString: () => string }).toString(),
          mint: nft.mint,
          holderToken: nft.tokenAccount,
          presented: nft.frozen,
          businessName: business?.name ?? "Unknown business",
          rewardLabel: business?.rewardLabel ?? "Reward",
          mintedAt: Number((entry.account.mintedAt as { toString: () => string }).toString()),
          expiresAt: Number((entry.account.expiresAt as { toString: () => string }).toString()),
          rentPayer: entry.account.rentPayer as PublicKey,
        };
      });

      if (cancelled) return;
      setVouchers(mapped);
      onCount?.(mapped.length);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [program, refreshKey, tick]);

  const anyPresented = vouchers?.some((v) => v.presented) ?? false;
  useEffect(() => {
    if (!anyPresented) return;
    const interval = setInterval(() => setTick((t) => t + 1), REFRESH_WHILE_PRESENTED_MS);
    return () => clearInterval(interval);
  }, [anyPresented]);

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
          rentPayer: v.rentPayer,
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

  return (
    <section aria-labelledby="my-vouchers" className="flex w-full flex-col gap-3">
      <h2 id="my-vouchers" className="eyebrow">My vouchers</h2>

      {vouchers.length === 0 && <p className="surface p-5 text-sm text-muted">No vouchers yet.</p>}

      {vouchers.map((v) => (
        <article key={v.address} className="surface overflow-hidden">
          <div className="flex items-stretch">
            <div className="min-w-0 flex-1 p-4">
              <p className="eyebrow flex items-center gap-1.5"><TicketIcon size={14} /> Token-2022 NFT</p>
              <h3 className="mt-1.5 text-lg font-semibold text-ink">{v.rewardLabel}</h3>
              <p className="mt-0.5 text-sm text-muted">
                {v.businessName} · <span className="font-mono">Voucher #{v.voucherId}</span>
              </p>
              <p className="mt-1 text-xs text-muted">Minted {new Date(v.mintedAt * 1000).toLocaleDateString()}</p>
              <p className="mt-0.5 text-xs text-muted">Valid until {new Date(v.expiresAt * 1000).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center border-l-2 border-dashed border-line-strong px-4">
              <span
                className={`-rotate-6 rounded-md border-2 px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-widest ${
                  v.presented ? "border-stamp-red text-stamp-red" : "border-verified text-verified"
                }`}
              >
                {v.presented ? "Presented" : "Ready"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-line p-4">
            {!v.presented ? (
              <>
                <Button disabled={busy === v.address} onClick={() => handlePresent(v)}>
                  {busy === v.address ? "Presenting…" : "Present to merchant"}
                </Button>
                <div className="flex gap-2">
                  <input
                    aria-label="Recipient's wallet address"
                    placeholder="Recipient's address"
                    className="field min-w-0 flex-1 font-mono text-sm"
                    value={giftAddress[v.address] ?? ""}
                    onChange={(e) => setGiftAddress((prev) => ({ ...prev, [v.address]: e.target.value }))}
                  />
                  <Button variant="outline" disabled={busy === v.address} onClick={() => handleGift(v, giftAddress[v.address] ?? "")}>
                    {busy === v.address ? "Sending…" : "Gift"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Show this to the merchant. While it is presented it can&apos;t be moved. When they redeem it, the NFT is burned.
                </p>
                <Button variant="outline" disabled={busy === v.address} onClick={() => handleCancel(v)}>
                  {busy === v.address ? "Cancelling…" : "Cancel"}
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line bg-paper-2/50 px-4 py-3">
            <OnChainId label="NFT mint" address={v.mint.toBase58()} />
            <OnChainId label="Token account" address={v.holderToken.toBase58()} />
            <OnChainId label="Voucher" address={v.address} />
          </div>
        </article>
      ))}
      {error && <p role="alert" className="text-sm text-stamp-red">{error}</p>}
    </section>
  );
}
