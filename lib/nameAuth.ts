import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

// A wallet's address is public on-chain, and the names endpoint is open to
// anyone, so without proof anyone could set (or overwrite) any wallet's
// display name. Only that wallet's owner has its secret key, so the
// customer's browser signs the name change and the server checks the
// signature. Same idea as lib/copilotAuth.ts, with its own first line in the
// message so a signature made for one purpose can never be used for the other.

// A name change repeated inside this window just sets the same name again, so
// this can be longer than the copilot's window: a phone clock a few minutes
// off shouldn't quietly lose someone's name.
export const NAME_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

export type SignedDisplayName = {
  address: string;
  name: string;
  timestamp: number;
  signature: string;
};

function messageBytes(address: string, name: string, timestamp: number): Uint8Array {
  return new TextEncoder().encode(
    `Passdari display name v1\n${JSON.stringify({ address, name, timestamp })}`
  );
}

// Runs in the customer's browser. The secret key never leaves it.
export function signDisplayName(keypair: Keypair, name: string): SignedDisplayName {
  const address = keypair.publicKey.toBase58();
  const timestamp = Date.now();
  const signature = nacl.sign.detached(messageBytes(address, name, timestamp), keypair.secretKey);
  return { address, name, timestamp, signature: Buffer.from(signature).toString("base64") };
}

export type DisplayNameAuthResult = { ok: true } | { ok: false; reason: "invalid" | "expired" };

// Runs on the server. The signature is checked before the age, so "expired" is
// only ever said to someone who really did sign it with that wallet's key.
export function verifyDisplayName(
  request: { address: string; name: string; timestamp: unknown; signature: unknown },
  now: number = Date.now()
): DisplayNameAuthResult {
  const { address, name, timestamp, signature } = request;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return { ok: false, reason: "invalid" };
  if (typeof signature !== "string") return { ok: false, reason: "invalid" };

  const signatureBytes = Buffer.from(signature, "base64");
  if (signatureBytes.length !== nacl.sign.signatureLength) return { ok: false, reason: "invalid" };

  let addressBytes: Uint8Array;
  try {
    addressBytes = new PublicKey(address).toBytes();
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const genuine = nacl.sign.detached.verify(messageBytes(address, name, timestamp), signatureBytes, addressBytes);
  if (!genuine) return { ok: false, reason: "invalid" };

  if (Math.abs(now - timestamp) > NAME_SIGNATURE_MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}
