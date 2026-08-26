"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/lib/useProgram";
import { RegisterBusinessForm } from "@/components/RegisterBusinessForm";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

type Business = { name: string; category: string; rewardLabel: string };

export default function Home() {
  const program = useProgram();
  const wallet = useAnchorWallet();
  const [myBusiness, setMyBusiness] = useState<Business | null | "checking">("checking");

  const checkForBusiness = () => {
    if (!program || !wallet) return;
    setMyBusiness("checking");

    const [businessPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("business"), wallet.publicKey.toBuffer()],
      program.programId
    );

    program.account.business
      .fetch(businessPda)
      .then((account) => setMyBusiness(account as Business))
      .catch(() => setMyBusiness(null));
  };

  useEffect(checkForBusiness, [program, wallet]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center gap-6 py-32 px-16 bg-white dark:bg-black">
        <WalletMultiButton />

        {!wallet && <p>Connect a wallet to get started.</p>}

        {wallet && myBusiness === "checking" && <p>Checking your account...</p>}

        {wallet && myBusiness === null && (
          <RegisterBusinessForm onDone={checkForBusiness} />
        )}

        {wallet && myBusiness && myBusiness !== "checking" && (
          <p>Welcome back, {myBusiness.name}.</p>
        )}
      </main>
    </div>
  );
}