import Link from "next/link";
import type { Metadata } from "next";
import { getDirectorySafely, categoriesOf } from "@/lib/directory";
import { BusinessSlip } from "@/components/ui/BusinessSlip";
import { ArrowRightIcon } from "@/components/ui/icons";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "All shops on Passdari",
  description:
    "Every shop running a Passdari stamp card, with the stamps and rewards each one has given — all counted on Solana and open to check.",
};

// Searching happens on the server through a plain GET form. That keeps the results in the HTML (so they
// can be read by a search engine and by anyone with JavaScript turned off), and it gives every search a
// real, shareable URL.
export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const all = await getDirectorySafely();
  const categories = categoriesOf(all);

  const needle = query.toLowerCase();
  const results = needle
    ? all.filter(
        (b) =>
          b.name.toLowerCase().includes(needle) ||
          b.category.toLowerCase().includes(needle) ||
          b.rewardLabel.toLowerCase().includes(needle)
      )
    : all;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted">
        <Link href="/" className="hover:text-ink">Passdari</Link> · Shops
      </p>
      <h1 className="mt-1 text-balance text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.95] text-ink">
        Every shop on Passdari
      </h1>
      <p className="mt-3 max-w-2xl text-base text-ink">
        {all.length} {all.length === 1 ? "shop has" : "shops have"} registered. Each one&apos;s stamps,
        rewards and customers are counted on Solana, so every number here can be checked by anyone.
      </p>

      <form method="get" role="search" className="mt-6 flex flex-wrap items-center gap-2">
        <label htmlFor="q" className="sr-only">Search shops by name, category or reward</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search by name, category or reward"
          className="field min-w-0 flex-1 sm:max-w-md"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 font-display text-sm font-extrabold uppercase tracking-wide text-paper hover:bg-ink-deep"
        >
          Search <ArrowRightIcon size={16} />
        </button>
        {query && (
          <Link href="/businesses" className="font-mono text-xs uppercase tracking-wide text-muted underline underline-offset-4 hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      {categories.length > 0 && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Shop categories">
          {categories.map((c) => (
            <Link key={c.slug} href={`/businesses/${c.slug}`}
              className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-line bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink hover:border-ink">
              {c.name} <span className="text-muted">{c.count}</span>
            </Link>
          ))}
        </nav>
      )}

      {query && (
        <p className="mt-6 font-mono text-xs uppercase tracking-wide text-muted">
          {results.length} {results.length === 1 ? "match" : "matches"} for &ldquo;{query}&rdquo;
        </p>
      )}

      {results.length === 0 ? (
        <p className="mt-6 text-base text-ink">
          {all.length === 0
            ? "No shops have registered yet."
            : "No shop matched that. Try a category above, or a shorter word."}
        </p>
      ) : (
        <ul className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((b) => (
            <li key={b.address}><BusinessSlip business={b} headingLevel={2} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
