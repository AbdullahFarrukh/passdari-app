"use client";

import { FC, ReactNode, createContext, useContext, useMemo } from "react";
import { Connection } from "@solana/web3.js";
import { failoverFetch } from "@/lib/rpcFetch";

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

// Reads go wherever NEXT_PUBLIC_SOLANA_RPC_URL points, and to devnet's own public endpoint when it
// points nowhere.
//
// Deliberately no longer the Helius endpoint the server side still uses. That endpoint was measured
// returning contradictory data for the same account: reading one stamp card every few seconds had its
// stamp count alternating between 0 and 1, at "confirmed" and at "finalized" alike, twice even at the
// identical context slot — only possible if the reads are answered by nodes that disagree with each
// other. On screen that made a card appear and disappear from "My cards" by itself, and blinked the
// same customer in and out of the merchant's loyal-customers list at the same moment. The public
// endpoint returned the same correct answer on every read of both those queries, comfortably inside
// its rate limits at the rate these screens poll. Point this at a paid, dedicated endpoint before
// mainnet — after checking it reads consistently.
export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  // Read at "confirmed", the same level the relay waits for before it says a
  // transaction is done. Without this the connection reads at "finalized",
  // which trails by about 13 seconds, so screens keep showing old data after
  // an action. (wallet-adapter's ConnectionProvider used to set this for us.)
  const connection = useMemo(
    () => new Connection(endpoint, { commitment: "confirmed", fetch: failoverFetch(endpoint) }),
    [endpoint]
  );

  return <ConnectionContext.Provider value={connection}>{children}</ConnectionContext.Provider>;
};

export function useConnection(): { connection: Connection } {
  const connection = useContext(ConnectionContext);
  if (!connection) {
    throw new Error("useConnection must be used within a WalletContextProvider");
  }
  return { connection };
}