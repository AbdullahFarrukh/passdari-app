"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/lib/useProgram";
import { RegisterBusinessForm } from "@/components/RegisterBusinessForm";
import { MerchantDashboard } from "@/components/MerchantDashboard";
import { NewSaleForm } from "@/components/NewSaleForm";
import { PresentedVouchers } from "@/components/PresentedVouchers";
import { MerchantCopilot } from "@/components/MerchantCopilot";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function Home() {
  const program = useProgram();
  const wallet = useAnchorWallet();
  const { disconnect } = useWallet();
  const [myBusiness, setMyBusiness] = useState<any | null | "checking">("checking");
  const [refreshKey, setRefreshKey] = useState(0);

  const checkForBusiness = () => {
    if (!program || !wallet) return;
    setMyBusiness("checking");

    const [businessPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("business"), wallet.publicKey.toBuffer()],
      program.programId
    );

    program.account.business
      .fetch(businessPda)
      .then((account) => setMyBusiness(account))
      .catch(() => setMyBusiness(null));
  };

  useEffect(checkForBusiness, [program, wallet]);

  async function handleLowerThreshold() {
    if (!program || !wallet || !myBusiness || myBusiness === "checking") return;

    const [businessPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("business"), wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .updateBusinessConfig(
        myBusiness.rewardLabel,
        1,
        myBusiness.minPurchaseAmount,
        myBusiness.receiptTtlSeconds
      )
      .accounts({
        business: businessPda,
        authority: wallet.publicKey,
      })
      .rpc();

    checkForBusiness();
  }

  async function handleSignOut() {
    await disconnect();
    setMyBusiness("checking");
  }

  return (
    <div className="min-h-screen bg-paper text-charcoal">
      <header className="grid grid-cols-3 items-center px-8 py-4 border-b border-line">
        <div className="justify-self-start">
          <WalletMultiButton />
        </div>
        <p className="font-mono text-lg text-ink text-center">Loyalty — Merchant</p>
        <div className="justify-self-end">
          {wallet && myBusiness && myBusiness !== "checking" && (
                       <button
              className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-col items-center gap-6 py-10 px-8">
        {!wallet && <p className="text-sm text-charcoal/60">Connect a wallet to get started.</p>}

        {wallet && myBusiness === "checking" && (
          <p className="text-sm text-charcoal/60 font-mono">Checking your account…</p>
        )}

        {wallet && myBusiness === null && <RegisterBusinessForm onDone={checkForBusiness} />}

        {wallet && myBusiness && myBusiness !== "checking" && (
          <>
            <MerchantDashboard business={myBusiness} />

            <NewSaleForm
              minPurchaseMinor={Number(myBusiness.minPurchaseAmount.toString())}
              onDone={checkForBusiness}
            />

            <MerchantCopilot ownerAddress={wallet.publicKey.toBase58()} />

            <PresentedVouchers
              wallet={wallet}
              refreshKey={refreshKey}
              onChange={() => {
                setRefreshKey((k) => k + 1);
                checkForBusiness();
              }}
            />

            <button onClick={handleLowerThreshold} className="text-xs text-charcoal/40 underline">
              Lower reward threshold to 1 (testing only)
            </button>
          </>
        )}
      </main>
    </div>
  );
}