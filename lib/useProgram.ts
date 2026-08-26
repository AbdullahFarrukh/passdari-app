"use client";

import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, setProvider } from "@anchor-lang/core";
import idl from "./loyalty.json";
import type { Loyalty } from "./loyalty";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {});
    setProvider(provider);
    return new Program(idl as Loyalty, provider);
  }, [connection, wallet]);
}