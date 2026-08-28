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

    // The exact message bytes both signers must sign against.
    const messageBytes = tx.serializeMessage();

    // Find the customer's already-present signature — used exactly as
    // received, never recomputed.
    const customerEntry = tx.signatures.find(
      (s) => s.publicKey.toBase58() !== relayer.publicKey.toBase58()
    );
    if (!customerEntry?.signature) {
      throw new Error("Customer signature missing from the received transaction");
    }

    // Compute the relayer's own signature against that exact same message.
    const relayerSignature = Buffer.from(nacl.sign.detached(messageBytes, relayer.secretKey));

    // Build the final wire-format transaction by hand: a signature-count
    // byte, each signature in the order the message expects, then the raw
    // message bytes — never touched by any automatic recompilation.
    // Transaction.serialize() has its own internal logic for reassembling
    // this, and after a deserialize-and-mutate cycle, that reassembly can
    // silently diverge from the exact bytes each signature was actually
    // computed against, even when each individual signature is correct.
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
    await connection.confirmTransaction(signature, "confirmed");

    return NextResponse.json({ signature });
  } catch (err) {
    console.error("Relay error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong" },
      { status: 500 }
    );
  }
}