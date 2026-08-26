import { useMemo } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, setProvider } from "@anchor-lang/core";
import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import idl from "./loyalty.json";
import type { Loyalty } from "./loyalty";

function walletFromKeypair(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
      if (tx instanceof Transaction) tx.partialSign(keypair);
      else tx.sign([keypair]);
      return tx;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
      txs.forEach((tx) => {
        if (tx instanceof Transaction) tx.partialSign(keypair);
        else tx.sign([keypair]);
      });
      return txs;
    },
  };
}

export function useCustomerProgram(keypair: Keypair | null) {
  const { connection } = useConnection();
  return useMemo(() => {
    if (!keypair) return null;
    const wallet = walletFromKeypair(keypair);
    const provider = new AnchorProvider(connection, wallet, {});
    setProvider(provider);
    return new Program(idl as Loyalty, provider);
  }, [connection, keypair]);
}