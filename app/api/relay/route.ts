import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import fs from "node:fs";
import path from "node:path";

const connection = new Connection("http://127.0.0.1:8899");

const relayerSecretKey = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "relayer-keypair.json"), "utf-8")
);
const relayer = Keypair.fromSecretKey(new Uint8Array(relayerSecretKey));

export async function POST(request: NextRequest) {
  try {
    const { transaction } = await request.json();
    const tx = Transaction.from(Buffer.from(transaction, "base64"));

    // Never call partialSign here, for either signer — it recompiles the
    // message from scratch on every call, which can silently invalidate an
    // already-attached signature once a transaction has been through a
    // serialize/deserialize round trip. Compute both signatures directly
    // against the same frozen message bytes instead, and insert both with
    // addSignature, which just places bytes without recompiling anything.
    const messageBytes = tx.serializeMessage();

    const realSignerEntry = tx.signatures.find(
      (s) => s.publicKey.toBase58() !== relayer.publicKey.toBase58()
    );
    if (!realSignerEntry?.signature) {
      throw new Error("Real signer's signature missing from the received transaction");
    }

    const relayerSignature = Buffer.from(nacl.sign.detached(messageBytes, relayer.secretKey));

    const signatureBuffers = tx.signatures.map((s) =>
      s.publicKey.toBase58() === relayer.publicKey.toBase58()
        ? relayerSignature
        : Buffer.from(s.signature!)
    );

    const wireTransaction = Buffer.concat([
      Buffer.from([tx.signatures.length]),
      ...signatureBuffers,
      messageBytes,
    ]);

    const signature = await connection.sendRawTransaction(wireTransaction);

    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction was included but failed on-chain: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    return NextResponse.json({ signature });
  } catch (err) {
    console.error("Relay error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong" },
      { status: 500 }
    );
  }
}