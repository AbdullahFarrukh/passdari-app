// Free, keyless devnet endpoints rate-limit hard: measured at roughly one getProgramAccounts a second
// before the 429s start, and none of the ones tried had meaningfully more room. They do agree with each
// other (same stamp counts, same card lists on every read), so when one says "too many requests" the
// same request can simply be asked of the next. That also beats web3.js's own answer to a 429, which is
// to wait and retry the same endpoint for up to several seconds, long enough for an action like
// cancelling a voucher to fail outright.
//
// Only a 429, a server error or a dropped connection moves on to the next endpoint. Anything else, a
// JSON-RPC error inside a 200 included, is a real answer and is returned as it came.
const FALLBACKS = [
  "https://devnet.rpcpool.com",
  "https://solana-devnet.api.onfinality.io/public",
];

export const RPC_FALLBACK_ORIGINS = FALLBACKS.map((url) => new URL(url).origin);

export function failoverFetch(primary: string): typeof fetch {
  const endpoints = [primary, ...FALLBACKS.filter((url) => url !== primary)];
  return async (input, init) => {
    let last: Response | null = null;
    let lastError: unknown = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, init);
        if (res.status !== 429 && res.status < 500) return res;
        last = res;
      } catch (err) {
        lastError = err;
      }
    }
    if (last) return last;
    throw lastError ?? new Error(`RPC request to ${String(input)} failed`);
  };
}
