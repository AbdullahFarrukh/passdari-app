import { Redis } from "@upstash/redis";

// Customer display names: a small list of wallet address -> name, so the
// merchant's dashboard and the copilot can say "Ahmed" instead of a long
// address. It's only decoration. Every fact that matters lives on-chain, and
// nothing breaks if a name is missing.
//
// This used to be a SQLite file. That works on a laptop, but a Vercel
// serverless function has no disk that lasts, so on the live site names were
// never saved. They now live in Upstash Redis, a small hosted store that both
// a laptop and Vercel can reach over the internet.

// The store's address and password. Vercel's Upstash integration sets the
// KV_REST_API_* names; Upstash's own dashboard uses UPSTASH_REDIS_REST_*.
// Either pair works.
function storeSettings() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
  };
}

// Test names, preview deployments and the live site each get their own list
// inside the same store, so trying things out never puts a fake name on the
// live dashboard.
function namesKey(): string {
  const environment =
    process.env.VERCEL_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development");
  return `passdari:customer_names:${environment}`;
}

let client: Redis | null | undefined;

function getClient(): Redis | null {
  if (client !== undefined) return client;
  const { url, token } = storeSettings();
  // Automatic deserialization is off on purpose. With it on, the library
  // "helpfully" turns a name like 123 into a number, and a name like {"a":1}
  // into an object. A display name is always plain text, so keep it that way.
  client = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;
  return client;
}

// With no store set up, local development still works: names are kept in
// memory and disappear when the dev server restarts. On the live site that
// would be a silent trap (names that seem saved but aren't), so there it
// fails loudly instead.
const inProduction = process.env.NODE_ENV === "production";
const devNames = new Map<string, string>();
let warnedAboutMemory = false;

function noStoreConfigured(): void {
  if (inProduction) {
    console.error(
      "Customer names are unavailable: no Upstash Redis settings found (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_URL / KV_REST_API_TOKEN)."
    );
  } else if (!warnedAboutMemory) {
    warnedAboutMemory = true;
    console.warn(
      "No Upstash Redis settings found — keeping customer names in memory only. They will be lost when the dev server restarts."
    );
  }
}

// Returns whether the name was really saved, so the caller can say so.
export async function setCustomerName(address: string, name: string): Promise<boolean> {
  const redis = getClient();
  if (!redis) {
    noStoreConfigured();
    if (inProduction) return false;
    devNames.set(address, name);
    return true;
  }

  try {
    await redis.hset(namesKey(), { [address]: name });
    return true;
  } catch (err) {
    console.error("Could not save the customer name:", err);
    return false;
  }
}

export async function getCustomerNames(addresses: string[]): Promise<Record<string, string>> {
  if (addresses.length === 0) return {};

  const redis = getClient();
  if (!redis) {
    noStoreConfigured();
    const found: Record<string, string> = {};
    if (!inProduction) {
      for (const address of addresses) {
        const name = devNames.get(address);
        if (name !== undefined) found[address] = name;
      }
    }
    return found;
  }

  try {
    // With automatic deserialization off, HMGET answers with a plain list in
    // the same order as the addresses, and null for anyone without a name.
    // The other shape (a field -> value object) is handled too, in case a
    // later version of the library changes this.
    const answer: unknown = await redis.hmget(namesKey(), ...addresses);
    const found: Record<string, string> = {};
    addresses.forEach((address, i) => {
      const value = Array.isArray(answer)
        ? answer[i]
        : (answer as Record<string, unknown> | null)?.[address];
      if (value !== null && value !== undefined) found[address] = String(value);
    });
    return found;
  } catch (err) {
    // A missing name just shows the address instead, so don't fail the whole page.
    console.error("Could not load customer names:", err);
    return {};
  }
}
