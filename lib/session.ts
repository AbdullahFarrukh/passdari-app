import { Keypair } from "@solana/web3.js";

// Keeps someone signed in across a page reload.
//
// Until now the signed-in key lived only in React state, so refreshing the page — or being sent back to
// it by the browser — dropped straight back to the sign-in screen. That is especially bad on the customer
// page, where a refresh is the obvious thing to try when you are waiting for something to arrive.
//
// This uses sessionStorage, not localStorage, on purpose: it is scoped to the one tab and is thrown away
// when that tab closes, so the key does not sit on disk after someone walks away from a shared computer.
// The 12 words stay in localStorage encrypted with the password, exactly as before; this only holds the
// already-unlocked key for the life of the tab. The honest trade-off is that anything able to run script
// in this page can now read the key for as long as the tab is open, rather than only while the page is
// loaded — the content security policy in next.config.ts is what keeps that door shut.

export type Role = "customer" | "merchant";

type StoredSession = { username: string; secretKey: string };

function keyFor(role: Role): string {
  return `passdari:session:${role}`;
}

export function saveSession(role: Role, username: string, keypair: Keypair): void {
  try {
    const stored: StoredSession = {
      username,
      secretKey: Buffer.from(keypair.secretKey).toString("base64"),
    };
    sessionStorage.setItem(keyFor(role), JSON.stringify(stored));
  } catch {
    // Private windows and blocked site data both throw here. Staying signed in is a convenience, so
    // losing it must never stop someone using the app.
  }
}

export function loadSession(role: Role): { username: string; keypair: Keypair } | null {
  try {
    const raw = sessionStorage.getItem(keyFor(role));
    if (!raw) return null;
    const { username, secretKey } = JSON.parse(raw) as StoredSession;
    if (typeof username !== "string" || typeof secretKey !== "string") return null;
    return { username, keypair: Keypair.fromSecretKey(new Uint8Array(Buffer.from(secretKey, "base64"))) };
  } catch {
    // Anything unreadable is treated as "not signed in" rather than breaking the page.
    clearSession(role);
    return null;
  }
}

export function clearSession(role: Role): void {
  try {
    sessionStorage.removeItem(keyFor(role));
  } catch {
    // Nothing to do — see saveSession.
  }
}
