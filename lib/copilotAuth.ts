import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

// The copilot hands out a business's customer data, so the server needs proof
// that whoever is asking really is that business's owner. A business's public
// key is public on-chain, so knowing it proves nothing. Only the merchant's own
// browser has the secret key, so the browser signs each request and the server
// checks the signature.
//
// The signature covers the owner, the exact question and the time, so:
// - it can't be reused for a different question or a different business
// - it stops working after a couple of minutes, so an old copy is useless
// Inside that window someone who copied the request could only repeat that
// same question, which just gives the same answer to the same data.

// How far the request's time may be from the server's clock, either way.
export const COPILOT_SIGNATURE_MAX_AGE_MS = 2 * 60 * 1000;

export type SignedCopilotRequest = {
  owner: string;
  question: string;
  timestamp: number;
  signature: string;
};

// JSON keeps the fields unambiguous (no way to slide text from one field into
// the next), and the first line means this signature can't be mistaken for one
// made for anything else.
function messageBytes(owner: string, question: string, timestamp: number): Uint8Array {
  return new TextEncoder().encode(
    `Passdari copilot request v1\n${JSON.stringify({ owner, question, timestamp })}`
  );
}

// Runs in the merchant's browser. The secret key never leaves it.
export function signCopilotRequest(keypair: Keypair, question: string): SignedCopilotRequest {
  const owner = keypair.publicKey.toBase58();
  const timestamp = Date.now();
  const signature = nacl.sign.detached(messageBytes(owner, question, timestamp), keypair.secretKey);
  return { owner, question, timestamp, signature: Buffer.from(signature).toString("base64") };
}

export type CopilotAuthResult = { ok: true } | { ok: false; reason: "invalid" | "expired" };

// Runs on the server. The signature is checked before the age, so "expired" is
// only ever said to someone who really did sign it with the owner's key.
export function verifyCopilotRequest(
  request: { owner: string; question: string; timestamp: unknown; signature: unknown },
  now: number = Date.now()
): CopilotAuthResult {
  const { owner, question, timestamp, signature } = request;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return { ok: false, reason: "invalid" };
  if (typeof signature !== "string") return { ok: false, reason: "invalid" };

  const signatureBytes = Buffer.from(signature, "base64");
  if (signatureBytes.length !== nacl.sign.signatureLength) return { ok: false, reason: "invalid" };

  let ownerBytes: Uint8Array;
  try {
    ownerBytes = new PublicKey(owner).toBytes();
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const genuine = nacl.sign.detached.verify(messageBytes(owner, question, timestamp), signatureBytes, ownerBytes);
  if (!genuine) return { ok: false, reason: "invalid" };

  if (Math.abs(now - timestamp) > COPILOT_SIGNATURE_MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}
