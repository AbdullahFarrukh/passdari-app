import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { unstable_cache } from "next/cache";
import { AnchorProvider, Program } from "@anchor-lang/core";
import idl from "./loyalty.json";
import type { Loyalty } from "./loyalty";
import { PROGRAM_ID } from "./explorer";
import { getCustomerNames } from "./db";

// The public shop directory. Everything here is read straight off Solana, with no private key involved —
// a business account and a stamp card are public data, so anyone (including a search engine) can be shown
// exactly what the chain says. That is the whole point: a shop's claim that it has handed out 47 rewards
// is not marketing copy here, it is an account anyone can open in a block explorer and check.
//
// Read at "confirmed" for the same reason lib/analytics.ts does: at "finalized" a shop that registered a
// moment ago would be missing from its own directory listing for about 13 seconds.
const connection = new Connection(process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");

export type DirectoryCustomer = {
  /// The display name the customer set for themselves, if they ever set one.
  name: string | null;
  address: string;
  rewards: number;
};

export type DirectoryBusiness = {
  address: string;
  owner: string;
  name: string;
  category: string;
  rewardLabel: string;
  stampsRequired: number;
  totalCards: number;
  totalStampsIssued: number;
  totalRedemptions: number;
  topCustomers: DirectoryCustomer[];
};

function readOnlyProgram(): Program<Loyalty> {
  // Nothing here signs anything, but Anchor still wants a wallet to build a provider, so it gets a
  // throwaway one. Same trick as the read-only path in lib/cleanup.ts.
  const throwaway = Keypair.generate();
  const wallet = {
    publicKey: throwaway.publicKey,
    async signTransaction<T extends Transaction>(tx: T): Promise<T> { return tx; },
    async signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]> { return txs; },
  };
  const provider = new AnchorProvider(connection, wallet as any, {});
  return new Program<Loyalty>(idl as Loyalty, provider);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as any).toString === "function") return Number((value as any).toString());
  return 0;
}

// How many rewards a customer has earned at one shop. The card counts this itself now. It used to be
// derived as (every stamp ever earned − stamps still on the card) ÷ the card's required count, which only
// held while that count never changed — and keeping it unchanged meant a customer who opened a card years
// ago was stuck on those terms for ever.
function rewardsEarned(card: { rewardsEarned: number }): number {
  return card.rewardsEarned;
}

/**
 * Every registered shop, busiest first, each with its five most loyal customers.
 *
 * This reads every business and every stamp card in one pass. That is the right shape while the whole
 * directory still fits comfortably in one request; if this ever grows to thousands of shops, the card
 * scan is the part to replace with a per-business query or a cached index.
 */
export async function getDirectory(): Promise<DirectoryBusiness[]> {
  const program = readOnlyProgram();
  const [businesses, cards] = await Promise.all([
    program.account.business.all(),
    program.account.loyaltyCard.all(),
  ]);

  // Group the cards by the shop they belong to, so each shop's leaderboard is one lookup.
  const cardsByBusiness = new Map<string, DirectoryCustomer[]>();
  for (const { account } of cards) {
    const businessKey = (account.business as PublicKey).toBase58();
    const rewards = rewardsEarned({ rewardsEarned: toNumber(account.rewardsEarned) });
    if (rewards <= 0) continue; // Nobody is a "top customer" before their first finished card.
    const list = cardsByBusiness.get(businessKey) ?? [];
    list.push({ name: null, address: (account.customer as PublicKey).toBase58(), rewards });
    cardsByBusiness.set(businessKey, list);
  }

  const ranked: DirectoryBusiness[] = businesses
    .map(({ publicKey, account }) => {
      const address = publicKey.toBase58();
      const topCustomers = (cardsByBusiness.get(address) ?? [])
        .sort((a, b) => b.rewards - a.rewards)
        .slice(0, 5);
      return {
        address,
        owner: (account.authority as PublicKey).toBase58(),
        name: account.name as string,
        category: (account.category as string) || "Other",
        rewardLabel: account.rewardLabel as string,
        stampsRequired: toNumber(account.stampsRequired),
        totalCards: toNumber(account.totalCards),
        totalStampsIssued: toNumber(account.totalStampsIssued),
        totalRedemptions: toNumber(account.totalRedemptions),
        topCustomers,
      };
    })
    // "Most used" means stamps actually handed over the counter, not how long ago someone signed up.
    .sort((a, b) =>
      b.totalStampsIssued - a.totalStampsIssued ||
      b.totalCards - a.totalCards ||
      a.name.localeCompare(b.name)
    );

  // One lookup for every name shown anywhere in the directory, instead of one per shop.
  const everyTopCustomer = ranked.flatMap((b) => b.topCustomers.map((c) => c.address));
  const names = everyTopCustomer.length > 0 ? await getCustomerNames([...new Set(everyTopCustomer)]) : {};
  for (const business of ranked) {
    business.topCustomers = business.topCustomers.map((c) => ({ ...c, name: names[c.address] ?? null }));
  }

  return ranked;
}

// Held for a couple of minutes so a busy day isn't one chain scan per visitor. This also keeps the pages
// that use it cacheable: the display-name lookup talks to Upstash, whose client sends `no-store`, and a
// `no-store` fetch anywhere in a page forces that whole page to be rebuilt on every single request.
// Caching the finished directory puts that fetch inside its own scope, where it can't do that.
export const DIRECTORY_CACHE_TAG = "passdari-directory";

const cachedDirectory = unstable_cache(getDirectory, ["passdari-business-directory"], {
  revalidate: 120,
  // Counters (stamps given, rewards given) are allowed to lag by up to the two minutes above — nobody is
  // watching a shop's stamp count tick. A shop that has just registered and can't find itself in the
  // directory is a different matter, so /api/relay clears this tag the moment one is created.
  tags: [DIRECTORY_CACHE_TAG],
});

/** Never let a directory outage take the home page down with it. */
export async function getDirectorySafely(): Promise<DirectoryBusiness[]> {
  try {
    return await cachedDirectory();
  } catch (err) {
    console.error("Could not load the business directory:", err);
    return [];
  }
}

export type DirectoryCategory = { name: string; slug: string; count: number };

/**
 * The address a category is browsed at.
 *
 * Shops typed their own category as free text for a long time, which left the directory with "FastFood",
 * "FastFoods", "Fast food" and "Fastfood" as four separate places to look. Folding case, punctuation and
 * a trailing plural puts those back together. The register form now offers a fixed list instead, so this
 * mainly exists to tidy up the shops that registered before it did.
 */
export function categorySlug(category: string): string {
  const flattened = category.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!flattened) return "other";
  return flattened.length > 3 && flattened.endsWith("s") ? flattened.slice(0, -1) : flattened;
}

export function categoriesOf(businesses: DirectoryBusiness[]): DirectoryCategory[] {
  const groups = new Map<string, { spellings: Map<string, number>; count: number }>();
  for (const b of businesses) {
    const slug = categorySlug(b.category);
    const group = groups.get(slug) ?? { spellings: new Map<string, number>(), count: 0 };
    group.count += 1;
    const label = b.category.trim() || "Other";
    group.spellings.set(label, (group.spellings.get(label) ?? 0) + 1);
    groups.set(slug, group);
  }

  return [...groups.entries()]
    .map(([slug, { spellings, count }]) => ({
      slug,
      // Show the spelling most shops in the group actually used, rather than the flattened slug.
      name: [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const PROGRAM_ADDRESS = PROGRAM_ID;
