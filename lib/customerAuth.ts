import { Keypair } from "@solana/web3.js";

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function signUp(username: string, password: string): Promise<Keypair> {
  if (localStorage.getItem(`customer:${username}`)) {
    throw new Error("That username is already taken on this device.");
  }

  const keypair = Keypair.generate();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    keypair.secretKey
  );

  localStorage.setItem(
    `customer:${username}`,
    JSON.stringify({
      salt: Array.from(salt),
      iv: Array.from(iv),
      encrypted: Array.from(new Uint8Array(encrypted)),
    })
  );

  return keypair;
}

export async function signIn(username: string, password: string): Promise<Keypair> {
  const raw = localStorage.getItem(`customer:${username}`);
  if (!raw) throw new Error("No account found with that username on this device.");

  const { salt, iv, encrypted } = JSON.parse(raw);
  const key = await deriveKey(password, new Uint8Array(salt));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(encrypted)
  );

  return Keypair.fromSecretKey(new Uint8Array(decrypted));
}