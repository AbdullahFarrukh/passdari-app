import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";

const connection = new Connection(process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com");

// The relayer's real secret key, read from an environment variable rather
// than a local file — a plain file on disk works fine on a developer's own
// machine, but a deployed server (Vercel, or anywhere else) has no such
// file at all, and shouldn't: this keeps the real key out of the repo
// entirely, set once in the hosting platform's own secrets dashboard.
const relayerSecretKey = JSON.parse(process.env.RELAYER_SECRET_KEY!);
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

    const signature = await connection.sendRawTransaction(wireTransaction, {
      preflightCommitment: "confirmed",
    });

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