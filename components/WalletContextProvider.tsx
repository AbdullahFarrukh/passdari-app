"use client";

import { FC, ReactNode, createContext, useContext, useMemo } from "react";
import { Connection } from "@solana/web3.js";

// The name is a holdover from the Phantom-wallet era — no wallets are
// registered here anymore, on either the merchant or customer side. What
// genuinely still matters is the connection itself: every Anchor call in
// this entire app, on both sides, ultimately gets its RPC endpoint from
// this one provider.
//
// This used to come from @solana/wallet-adapter-react's ConnectionProvider,
// but that package (and its UI/base siblings, which this app never used at
// all) drags in a huge, unrelated dependency chain — including React
// Native's bundler — purely for wallet-connect features this app doesn't
// use, since accounts here are derived from a local mnemonic instead of an
// external wallet. A plain context holding a Connection does the same job
// with none of that.
const ConnectionContext = createContext<Connection | null>(null);

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = useMemo(() => new Connection(endpoint), [endpoint]);

  return <ConnectionContext.Provider value={connection}>{children}</ConnectionContext.Provider>;
};

export function useConnection(): { connection: Connection } {
  const connection = useContext(ConnectionContext);
  if (!connection) {
    throw new Error("useConnection must be used within a WalletContextProvider");
  }
  return { connection };
}