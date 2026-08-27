"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";

const PROGRAM_ID = new PublicKey("HWvvvwSEounpNXcbD4JUNmniB5YxTcFNYoAestzJJCuL");

export default function EventTestPage() {
  const { connection } = useConnection();
  const [output, setOutput] = useState<string>("Click the button to check.");

  async function checkLogs() {
    setOutput("Loading...");

    const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 5 });

    if (signatures.length === 0) {
      setOutput("No transactions found for this program yet.");
      return;
    }

    const tx = await connection.getTransaction(signatures[0].signature, {
      maxSupportedTransactionVersion: 0,
    });

    setOutput(JSON.stringify(tx?.meta?.logMessages, null, 2));
  }

  return (
    <div className="flex flex-col gap-4 p-8">
      <button onClick={checkLogs} className="border rounded-md px-4 py-2 w-fit">
        Check most recent transaction's logs
      </button>
      <pre className="text-xs whitespace-pre-wrap bg-gray-100 p-4 rounded-md">{output}</pre>
    </div>
  );
}