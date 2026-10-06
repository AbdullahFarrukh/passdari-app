import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import { isRateLimited } from "@/lib/rateLimit";

const connection = new Connection(process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com");

// The relayer's real secret key, read from an environment variable rather
// than a local file — a plain file on disk works fine on a developer's own
// machine, but a deployed server (Vercel, or anywhere else) has no such
// file at all, and shouldn't: this keeps the real key out of the repo
// entirely, set once in the hosting platform's own secrets dashboard.
const relayerSecretKey = JSON.parse(process.env.RELAYER_SECRET_KEY!);
const relayer = Keypair.fromSecretKey(new Uint8Array(relayerSecretKey));

// Only ever co-sign instructions aimed at our own program. Without this,
// anyone could hand this endpoint a transaction containing, say, a plain
// SystemProgram transfer moving lamports out of the relayer's own account
// (the relayer still has to be a signer on it — but this endpoint would
// have happily provided that signature) — every legitimate instruction
// this app ever builds already targets this program, so nothing real
// breaks by rejecting anything else.
const LOYALTY_PROGRAM_ID = "HWvvvwSEounpNXcbD4JUNmniB5YxTcFNYoAestzJJCuL";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited("relay", ip, { max: 15, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests — please slow down." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const transaction = body?.transaction;
    if (typeof transaction !== "string" || transaction.length === 0 || transaction.length > 4000) {
      return NextResponse.json({ error: "Malformed transaction payload" }, { status: 400 });
    }

    const tx = Transaction.from(Buffer.from(transaction, "base64"));

    // Reject anything that isn't a call into our own program — see note above.
    const foreignInstruction = tx.instructions.find(
      (ix) => ix.programId.toBase58() !== LOYALTY_PROGRAM_ID
    );
    if (foreignInstruction) {
      return NextResponse.json(
        { error: "Transaction contains an instruction outside the Loyalty program" },
        { status: 400 }
      );
    }
    if (tx.instructions.length === 0) {
      return NextResponse.json({ error: "Transaction has no instructions" }, { status: 400 });
    }

    // Confirm the relayer is actually the declared fee payer, and is one of
    // the transaction's signer slots — a transaction that never names the
    // relayer as a signer at all shouldn't reach the signing logic below.
    if (!tx.feePayer || tx.feePayer.toBase58() !== relayer.publicKey.toBase58()) {
      return NextResponse.json({ error: "Relayer must be the fee payer" }, { status: 400 });
    }

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