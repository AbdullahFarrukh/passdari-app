"use client";

import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider } from "@anchor-lang/core";
import idl from "./loyalty.json";
import type { Loyalty } from "./loyalty";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {});
    return new Program(idl as Loyalty, { connection: provider.connection });
  }, [connection, wallet]);
}