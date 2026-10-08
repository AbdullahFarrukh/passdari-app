import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDirectorySafely, categoriesOf, categorySlug } from "@/lib/directory";
import { BusinessSlip } from "@/components/ui/BusinessSlip";

export const revalidate = 120;

// Build a page for every category that exists, so they are served as finished HTML rather than put
// together on the first visit. A category that appears later is still rendered on demand.
export async function generateStaticParams() {
  return categoriesOf(await getDirectorySafely()).map((c) => ({ category: c.slug }));
}

// Each category gets its own address, so "coffee shops with loyalty cards on Solana" has somewhere to land.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const businesses = await getDirectorySafely();
  const group = categoriesOf(businesses).find((c) => c.slug === category);
  const name = group?.name ?? category;
  const count = group?.count ?? 0;

  return {
    title: `${name} shops on Passdari`,
    description: `${count} ${name.toLowerCase()} ${count === 1 ? "shop" : "shops"} giving loyalty stamps on Passdari, with every stamp and reward counted on Solana.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const all = await getDirectorySafely();
  const inCategory = all.filter((b) => categorySlug(b.category) === category);

  // An empty category only means something went wrong if there are shops at all — a brand new install
  // with nothing registered yet should still show the page rather than a 404.
  if (inCategory.length === 0 && all.length > 0) notFound();

  const groups = categoriesOf(all);
  const name = groups.find((c) => c.slug === category)?.name ?? category;
  const others = groups.filter((c) => c.slug !== category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted">
        <Link href="/" className="hover:text-ink">Passdari</Link> ·{" "}
        <Link href="/businesses" className="hover:text-ink">Shops</Link> · {name}
      </p>
      <h1 className="mt-1 text-balance text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.95] text-ink">
        {name}
      </h1>
      <p className="mt-3 max-w-2xl text-base text-ink">
        {inCategory.length} {inCategory.length === 1 ? "shop" : "shops"} in this category, busiest first.
        Every figure comes straight from each shop&apos;s own account on Solana.
      </p>

      <ul className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {inCategory.map((b, i) => (
          <li key={b.address}><BusinessSlip business={b} rank={i + 1} headingLevel={2} /></li>
        ))}
      </ul>

      {others.length > 0 && (
        <nav className="mt-10 border-t-2 border-line pt-6" aria-label="Other categories">
          <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted">Other categories</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((c) => (
              <Link key={c.slug} href={`/businesses/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-line bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink hover:border-ink">
                {c.name} <span className="text-muted">{c.count}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
