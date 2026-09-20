import { Keypair } from "@solana/web3.js";
import { signDisplayName } from "./nameAuth";

// Saves a customer's display name, signed with their own wallet key (see
// nameAuth.ts for why). It never throws: a missing name only means the
// merchant's dashboard shows a shortened address, so a hiccup here must never
// get in the way of signing up or signing in.
//
// `onlyIfMissing` is for signing in: customers who signed up before names
// could be saved (or whose name never got through) get one now, but a name
// that is already there is left alone. It's off for sign-up, where the wallet
// is brand new and there is nothing to check.
export async function saveDisplayName(
  keypair: Keypair,
  name: string,
  options: { onlyIfMissing?: boolean; baseUrl?: string } = {}
): Promise<void> {
  const { onlyIfMissing = false, baseUrl = "" } = options;
  try {
    const address = keypair.publicKey.toBase58();

    if (onlyIfMissing) {
      const lookup = await fetch(`${baseUrl}/api/customer-name?addresses=${address}`);
      if (lookup.ok) {
        const { names } = await lookup.json();
        if (names?.[address]) return;
      }
      // If the lookup itself failed, go on and try to save: the name is just
      // the username, so saving it again is harmless.
    }

    const res = await fetch(`${baseUrl}/api/customer-name`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signDisplayName(keypair, name)),
    });
    if (!res.ok) console.error("Could not save display name:", res.status);
  } catch (err) {
    console.error("Could not save display name:", err);
  }
}
