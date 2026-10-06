import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";

// New accounts use 600,000 iterations (current OWASP guidance for PBKDF2-SHA256). Accounts created before
// this was raised have no `iterations` stored with them and were encrypted with 100,000, so they still
// decrypt with that count.
const PBKDF2_ITERATIONS = 600_000;
const LEGACY_PBKDF2_ITERATIONS = 100_000;
export const MIN_PASSWORD_LENGTH = 8;

async function deriveEncryptionKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function keypairFromMnemonic(mnemonic: string): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derived = derivePath("m/44'/501'/0'/0'", seed.toString("hex"));
  return Keypair.fromSeed(derived.key);
}

async function storeMnemonic(username: string, mnemonic: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt, PBKDF2_ITERATIONS);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(mnemonic)
  );

  localStorage.setItem(
    `customer:${username}`,
    JSON.stringify({
      salt: Array.from(salt),
      iv: Array.from(iv),
      iterations: PBKDF2_ITERATIONS,
      encrypted: Array.from(new Uint8Array(encrypted)),
    })
  );
}

export async function signUp(
  username: string,
  password: string
): Promise<{ keypair: Keypair; mnemonic: string }> {
  if (!username || !password) {
    throw new Error("Please enter a username and password.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (localStorage.getItem(`customer:${username}`)) {
    throw new Error("That username is already taken on this device.");
  }

  const mnemonic = bip39.generateMnemonic();
  const keypair = keypairFromMnemonic(mnemonic);
  await storeMnemonic(username, mnemonic, password);

  return { keypair, mnemonic };
}

export async function signIn(username: string, password: string): Promise<Keypair> {
  const raw = localStorage.getItem(`customer:${username}`);
  if (!raw) throw new Error("No account found with that username on this device.");

  const { salt, iv, encrypted, iterations } = JSON.parse(raw);
  const key = await deriveEncryptionKey(password, new Uint8Array(salt), iterations ?? LEGACY_PBKDF2_ITERATIONS);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(encrypted)
  );

  const mnemonic = new TextDecoder().decode(decrypted);
  return keypairFromMnemonic(mnemonic);
}

export async function recoverAccount(
  username: string,
  mnemonic: string,
  newPassword: string
): Promise<Keypair> {
  if (!username) {
    throw new Error("Please enter the username for this account.");
  }
  if (!newPassword) {
    throw new Error("Please choose a new password.");
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const trimmed = mnemonic.trim().toLowerCase();

  if (!bip39.validateMnemonic(trimmed)) {
    throw new Error("That doesn't look like a valid 12-word phrase. Check the spelling and spacing.");
  }

  const keypair = keypairFromMnemonic(trimmed);
  await storeMnemonic(username, trimmed, newPassword);

  return keypair;
}