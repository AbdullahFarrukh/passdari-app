import { Redis } from "@upstash/redis";

// A fixed-window request counter per caller. The count lives in Upstash Redis, so every serverless
// instance shares it — the per-instance memory counters this replaces reset on each cold start and
// were never shared, so a determined caller could walk straight past them.
//
// If the store can't be reached, the check falls back to a per-instance count rather than failing
// closed, so a store outage can't lock every real user out of the app.

type Limit = { max: number; windowMs: number };

const memoryHits = new Map<string, number[]>();

function memoryLimited(key: string, { max, windowMs }: Limit): boolean {
  const now = Date.now();
  const hits = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  memoryHits.set(key, hits);
  return hits.length > max;
}

let client: Redis | null | undefined;

function getClient(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

/**
 * `caller` is whatever identifies the thing being limited. Usually an IP address, but for something
 * worth limiting per person rather than per network — a whole café shares one IP — it can be a wallet
 * address instead. It is only ever used as part of the key.
 */
export async function isRateLimited(scope: string, caller: string, limit: Limit): Promise<boolean> {
  const key = `${scope}:${caller}`;
  const redis = getClient();
  if (redis) {
    try {
      const bucket = `passdari:rl:${key}:${Math.floor(Date.now() / limit.windowMs)}`;
      const count = await redis.incr(bucket);
      if (count === 1) await redis.expire(bucket, Math.ceil(limit.windowMs / 1000) + 1);
      return count > limit.max;
    } catch {
      // Fall through to the per-instance count below.
    }
  }
  return memoryLimited(key, limit);
}
