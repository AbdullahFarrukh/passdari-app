"use client";

import { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider } from "@solana/wallet-adapter-react";

// The name is a holdover from the Phantom-wallet era — no wallets are
// registered here anymore, on either the merchant or customer side. What
// genuinely still matters is the connection itself: every Anchor call in
// this entire app, on both sides, ultimately gets its RPC endpoint from
// this one provider.
export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? "https://api.devnet.solana.com",
    []
  );

  return <ConnectionProvider endpoint={endpoint}>{children}</ConnectionProvider>;
};