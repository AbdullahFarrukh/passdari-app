import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import { revalidateTag } from "next/cache";
import { isRateLimited } from "@/lib/rateLimit";
import { rejectCrossSite } from "@/lib/sameOrigin";
import { DIRECTORY_CACHE_TAG } from "@/lib/directory";

// The first eight bytes of a register_business call, from lib/loyalty.json. A new shop that cannot find
// itself in the directory looks broken, so this one instruction refreshes it straight away instead of
// waiting for the two-minute timer.
const REGISTER_BUSINESS_DISCRIMINATOR = Buffer.from([73, 228, 5, 59, 229, 67, 133, 82]);

// Passing stamps to a friend is the one thing a customer can do over and over that costs the relayer a
// fee and hands nothing back: no account is created, so no rent ever returns. Two people could bounce a
// single stamp between their cards all day and the relayer would pay for every hop.
//
// The limit is per sending wallet, not per IP, because everyone in one café shares an IP and would knock
// each other out. Ten a day is far above anything a real person does and far below anything that costs
// real money: ten hops is 0.0001 SOL.
const TRANSFER_STAMPS_DISCRIMINATOR = Buffer.from([84, 46, 125, 74, 19, 113, 252, 237]);
const TRANSFERS_PER_WALLET_PER_DAY = 10;

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
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
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

    // Stamp transfers are limited per sending wallet, checked before anything is signed or sent. The
    // sender is the one signer on the transaction that isn't the relayer.
    if (tx.instructions.some((ix) => ix.data.subarray(0, 8).equals(TRANSFER_STAMPS_DISCRIMINATOR))) {
      const sender = tx.signatures.find(
        (s) => s.publicKey.toBase58() !== relayer.publicKey.toBase58()
      )?.publicKey;
      if (!sender) {
        return NextResponse.json({ error: "A stamp transfer must be signed by the sender" }, { status: 400 });
      }
      const limited = await isRateLimited("transfer-stamps", sender.toBase58(), {
        max: TRANSFERS_PER_WALLET_PER_DAY,
        windowMs: 24 * 60 * 60 * 1000,
      });
      if (limited) {
        return NextResponse.json(
          { error: `You can send stamps up to ${TRANSFERS_PER_WALLET_PER_DAY} times a day. Please try again tomorrow.` },
          { status: 429 }
        );
      }
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

    if (tx.instructions.some((ix) => ix.data.subarray(0, 8).equals(REGISTER_BUSINESS_DISCRIMINATOR))) {
      // `{ expire: 0 }` drops the cached directory now rather than at the end of a profile window, so
      // the very next visitor reads it fresh and sees the new shop.
      revalidateTag(DIRECTORY_CACHE_TAG, { expire: 0 });
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