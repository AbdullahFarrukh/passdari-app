"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useProgram } from "@/lib/useProgram";
import { RegisterBusinessForm } from "@/components/RegisterBusinessForm";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function Home() {
  const program = useProgram();
  const [businessCount, setBusinessCount] = useState<number | null>(null);

  const refresh = () => {
    if (!program) return;
    program.account.business.all().then((accounts) => {
      setBusinessCount(accounts.length);
    });
  };

  useEffect(refresh, [program]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center gap-6 py-32 px-16 bg-white dark:bg-black">
        <WalletMultiButton />
        <p>Registered businesses: {businessCount ?? "loading..."}</p>
        <RegisterBusinessForm onDone={refresh} />
      </main>
    </div>
  );
}