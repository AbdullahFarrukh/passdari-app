import Link from "next/link";
import type { DirectoryBusiness } from "@/lib/directory";
import { categorySlug } from "@/lib/directory";
import { shortAddress, explorerAddressUrl } from "@/lib/explorer";
import { Receipt } from "@/components/ui/Receipt";
import { ReceiptRow } from "@/components/ui/ReceiptRow";
import { StoreIcon } from "@/components/ui/icons";

// One shop, printed as its own slip. Deliberately a server component with no interactivity: these are the
// pages a search engine reads, so the numbers have to be in the HTML, not fetched afterwards in a browser.
//
// Every figure on this slip comes from the shop's own account on Solana, and the address at the bottom is
// how anyone checks that for themselves — which is the one thing an ordinary loyalty app cannot offer.
export function BusinessSlip({ business, rank, headingLevel = 3 }: {
  business: DirectoryBusiness;
  rank?: number;
  /// A slip sits under the page's own heading, so on a listing page (h1 → shops) it is an h2, and inside
  /// the home page's directory section (h1 → h2 → shops) it is an h3. Skipping a level breaks the outline
  /// a screen reader navigates by.
  headingLevel?: 2 | 3;
}) {
  const { name, category, rewardLabel, stampsRequired, totalCards, totalStampsIssued, totalRedemptions, topCustomers, address } = business;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <Receipt className="flex h-full flex-col px-5 pb-4 pt-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-ink" aria-hidden="true"><StoreIcon size={22} /></span>
        <div className="min-w-0 flex-1">
          <Heading className="font-display text-2xl font-extrabold uppercase leading-tight text-ink">
            {rank ? <span className="text-muted">{rank}. </span> : null}{name}
          </Heading>
          <Link
            href={`/businesses/${categorySlug(category)}`}
            className="mt-1.5 inline-block rounded-[10px] border-2 border-line px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[.08em] text-muted hover:border-ink hover:text-ink"
          >
            {category}
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <ReceiptRow label="Reward" value={rewardLabel} />
        <ReceiptRow label="Stamps needed" value={stampsRequired} />
        <ReceiptRow label="Cards started" value={totalCards} />
        <ReceiptRow label="Stamps given" value={totalStampsIssued} />
        {/* The shop's own counter only goes up when a voucher is actually handed over the counter, so
            this is not the same as the number of cards customers have finished below — someone can be
            holding a reward they haven't collected yet. "Given" read like it should match, and didn't. */}
        <ReceiptRow label="Rewards redeemed" value={totalRedemptions} />
      </div>

      <div className="mt-4 border-t-2 border-line pt-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted">Most loyal customers</p>
        {topCustomers.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted">No one has finished a card here yet.</p>
        ) : (
          <ol className="mt-2 flex flex-col gap-1.5">
            {topCustomers.map((c, i) => (
              <li key={c.address} className="flex items-baseline gap-2 font-mono text-xs">
                <span className="w-4 text-right text-[10px] text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-ink">
                  {c.name ?? shortAddress(c.address)}
                </span>
                <span className="shrink-0 text-muted">
                  {c.rewards} {c.rewards === 1 ? "reward" : "rewards"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-auto pt-4">
        <a
          href={explorerAddressUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[.08em] text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Check this shop on-chain · {shortAddress(address)}
        </a>
      </div>
    </Receipt>
  );
}
