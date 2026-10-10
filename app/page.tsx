import Link from "next/link";
import { PROGRAM_ID } from "@/lib/explorer";
import { OnChainId } from "@/components/ui/OnChainId";
import { WalletExplainer } from "@/components/WalletExplainer";
import { Receipt } from "@/components/ui/Receipt";
import { ReceiptRow } from "@/components/ui/ReceiptRow";
import { Barcode, BARCODE_B } from "@/components/ui/Barcode";
import { ArrowRightIcon } from "@/components/ui/icons";
import { BusinessSlip } from "@/components/ui/BusinessSlip";
import { HeroScanDemo } from "@/components/HeroScanDemo";
import { getDirectorySafely, categoriesOf, type DirectoryBusiness } from "@/lib/directory";

// The directory is read from the chain, so the page is rebuilt on a timer rather than on every visit:
// fresh enough that a shop appears within a couple of minutes of registering, cheap enough that a busy
// day doesn't turn into one RPC round trip per visitor.
export const revalidate = 120;

const STEPS = [
  { n: "1", label: "Receipt", status: "Issued", text: "The merchant issues a one-time receipt as an account on Solana. It expires if nobody claims it." },
  { n: "2", label: "Stamp", status: "Claimed", text: "Claiming closes the receipt and adds a stamp to your card. Nobody can claim the same receipt twice." },
  { n: "3", label: "Voucher", status: "Minted (NFT)", text: "Spend your stamps and you receive a Token-2022 NFT that you can present, keep or gift." },
  { n: "4", label: "Redeem", status: "Burned", text: "The merchant redeems it and the token is burned, so a voucher can never be used twice." },
];

// What the dApp actually does, itemised — static marketing copy, each line checked against the README
// and the program's own instruction list rather than written from memory.
const FEATURES: { title: string; tag: string; text: string }[] = [
  { title: "No wallet to install", tag: "BIP-39", text: "Sign up with a username and a password. Your keys are built in your browser from 12 words. You never install an extension and never hold SOL." },
  { title: "Somebody else pays the fees", tag: "RELAYER", text: "A backend relayer co-signs every transaction and covers every fee and every account’s rent — for customers and merchants both." },
  { title: "A stamp you claim, not one you are handed", tag: "ONE-SHOT", text: "The shop issues an unclaimed receipt on-chain. It can be claimed exactly once, by whoever scans it, and it expires if nobody does." },
  { title: "Your card is soulbound", tag: "TOKEN-2022", text: "The stamp card is a token that cannot be sent to another wallet, and is burned when you cash its stamps in. The next stamp brings a fresh one." },
  { title: "The reward is a real NFT", tag: "TRANSFERABLE", text: "Hit the target and you mint a voucher. Keep it, hand the token to a friend, or redeem it yourself." },
  { title: "Neither side can cheat the swap", tag: "TWO-PARTY", text: "You present the voucher, which freezes it; the shop redeems it. A shop cannot burn it alone, you cannot take the item alone, and presenting can be cancelled." },
  { title: "Terms are published, not promised", tag: "ON-CHAIN", text: "Reward terms live on-chain, so they cannot be applied differently to different people. A shop can commit to an offer for up to a year, and needs 14 days’ notice to shorten it." },
  { title: "Stamps can move between people", tag: "SAME SHOP", text: "Send stamps to another customer at the same shop. Nothing is minted — the count only moves." },
  { title: "Nothing stays stranded", tag: "RENT BACK", text: "Expired receipts, spent vouchers, card NFTs idle for 90 days, dead cards and closed shops all return their rent to whoever paid for them." },
  { title: "Take the wallet with you", tag: "PHANTOM", text: "Your 12 words open the same wallet in Phantom or Solflare, with the cards and vouchers already inside it." },
  { title: "A copilot on the shop side", tag: "GEMINI", text: "Merchants can ask about their own data — who is closest to a reward, when they are busiest — with every request signed by the shop’s own key." },
  { title: "Covered by 103 tests", tag: "LITESVM", text: "The program runs against 103 Rust tests, and every failure test asserts the specific error it should fail with, so none can pass for the wrong reason." },
];

// "Your receipt": the app's own explanation, printed as one, with a line per step.
function HowItWorksReceipt() {
  return (
    <Receipt className="px-6 pb-2 pt-5 sm:px-8">
      <p className="text-center font-mono text-[10.5px] tracking-[.14em] text-muted">PASSDARI · HOW IT WORKS</p>
      <p className="mt-1.5 text-center font-display text-3xl font-extrabold uppercase text-ink">Your receipt</p>

      <div className="mt-4 flex flex-col gap-3.5">
        {STEPS.map((s) => (
          <div key={s.n}>
            <ReceiptRow label={`${s.n} ${s.label}`} value={s.status} className="text-sm" />
            <p className="mt-0.5 text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t-2 border-line pt-2.5">
        <ReceiptRow label="Total" value="1 Free coffee" className="text-sm" />
      </div>
      <div className="my-3 flex justify-center">
        <Barcode bars={BARCODE_B} width={250} height={34} />
      </div>
    </Receipt>
  );
}

// One shop, printed small, for the scrolling row under the hero. Deliberately not BusinessSlip — that
// is the full, detailed card used in the real directory grid below (and on /businesses); this is a
// compact teaser, its own stamped-count the one number worth showing at a glance. Built entirely from
// tokens (bg-surface, text-ink, --accent-cyan) rather than one fixed palette, so it looks native in
// either theme rather than carrying dark-mode colours into a light page.
function MarqueeSlip({ business, rank }: { business: DirectoryBusiness; rank: number }) {
  return (
    <div className="w-[200px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="px-4 pb-3.5 pt-4">
        <p className="font-mono text-[9px] text-muted">#{rank}</p>
        <span className="tag-accent mt-1.5 inline-block px-2 py-[2px] font-mono text-[8.5px] uppercase tracking-wide">
          {business.category}
        </span>
        <p className="mt-2 truncate font-display text-xl font-extrabold uppercase leading-tight text-ink">{business.name}</p>
        <p className="mt-1 truncate font-mono text-[9px] uppercase text-muted">{business.rewardLabel}</p>
        <div className="mt-3 flex items-baseline gap-1.5 border-t border-dashed border-line pt-2.5 font-mono text-[9.5px] uppercase text-muted">
          <span>Stamps</span>
          <span className="-translate-y-0.5 min-w-2 flex-1 border-b border-dotted border-line-strong/60" />
          <span className="font-bold tabular-nums text-ink">{business.totalStampsIssued}</span>
        </div>
      </div>
    </div>
  );
}

// A continuously-scrolling row of real shops. The list is rendered twice back to back; `.marquee-track`
// moves it by exactly half its own width, so the loop has no visible seam. Needs a handful of shops to
// feel like a scrolling row rather than one card repeating — below that it just doesn't render.
function ShopMarquee({ shops }: { shops: DirectoryBusiness[] }) {
  if (shops.length < 4) return null;
  return (
    <div className="relative">
      {/* Fades to --band-bg, the same variable .band-raised paints its own background from — in light
          mode that's transparent, which is correct: there is no raised panel there to mask the edge of. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-16 bg-gradient-to-r from-[var(--band-bg)] to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-16 bg-gradient-to-l from-[var(--band-bg)] to-transparent sm:w-24" />
      <div className="marquee-viewport overflow-hidden">
        <div className="marquee-track flex w-max gap-4">
          {[...shops, ...shops].map((b, i) => (
            <MarqueeSlip key={`${b.address}-${i}`} business={b} rank={(i % shops.length) + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

// The real, functional directory: category links and the full BusinessSlip grid, unchanged from before —
// still the exact shared component /businesses uses, so a shop looks the same wherever it is checked.
function DirectoryGrid({ businesses }: { businesses: DirectoryBusiness[] }) {
  const top = businesses.slice(0, 6);
  const categories = categoriesOf(businesses);
  const rest = businesses.length - top.length;

  const listing = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Shops on Passdari",
    numberOfItems: businesses.length,
    itemListElement: top.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LocalBusiness",
        name: b.name,
        identifier: b.address,
        makesOffer: { "@type": "Offer", name: b.rewardLabel },
      },
    })),
  };

  return (
    // .band-raised: a raised panel in dark mode, transparent in light — in light mode this section
    // just sits on the plain yellow page, the way the directory always has.
    <section className="band-raised py-14 lg:py-16" aria-labelledby="directory">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listing) }} />
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted">Registered shops</p>
            <h2 id="directory" className="mt-1 text-balance text-[clamp(2rem,5vw,4rem)] font-extrabold uppercase leading-[0.98] text-ink">
              Where people are collecting
            </h2>
            <p className="mt-3 max-w-xl text-base text-ink">
              Every shop below registered itself on Passdari. The stamps, rewards and customers are counted
              on Solana, so you can check any of these numbers yourself.
            </p>
          </div>
          <Link href="/businesses" className="inline-flex min-h-11 items-center gap-2 rounded-full border-[2.5px] border-ink px-5 font-display text-sm font-extrabold uppercase tracking-wide text-ink hover:bg-ink hover:text-ground">
            Search all shops <ArrowRightIcon size={16} />
          </Link>
        </div>

        {categories.length > 1 && (
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Shop categories">
            {categories.map((c) => (
              <Link key={c.slug} href={`/businesses/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-line bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink hover:border-ink">
                {c.name} <span className="text-muted">{c.count}</span>
              </Link>
            ))}
          </nav>
        )}

        <ul className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((b, i) => (
            <li key={b.address}><BusinessSlip business={b} rank={i + 1} /></li>
          ))}
        </ul>

        {rest > 0 && (
          <p className="mt-6 text-sm text-ink">
            <Link href="/businesses" className="font-bold underline underline-offset-4">
              {rest} more {rest === 1 ? "shop" : "shops"}
            </Link>{" "}
            — search by name or pick a category above.
          </p>
        )}
      </div>
    </section>
  );
}

// Big numbers, not a screenshot — the home page's version of "don't take our word for it," a section
// earlier instead of one at the end. Every figure is summed from the same directory read Directory and
// the marquee already use, not a separate, hand-maintained count.
function StatsBand({ businesses }: { businesses: DirectoryBusiness[] }) {
  const stamps = businesses.reduce((sum, b) => sum + b.totalStampsIssued, 0);
  const cards = businesses.reduce((sum, b) => sum + b.totalCards, 0);
  const redemptions = businesses.reduce((sum, b) => sum + b.totalRedemptions, 0);
  const stats = [
    { n: businesses.length, l: "Shops registered" },
    { n: cards, l: "Cards opened" },
    { n: stamps, l: "Stamps given" },
    { n: redemptions, l: "Rewards redeemed" },
  ];
  return (
    <section className="band-raised px-4 py-14 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-[var(--accent-cyan)]">Not our word for it</p>
          <h2 id="counted" className="mt-2 text-balance text-[clamp(1.65rem,3.6vw,2.4rem)] font-extrabold uppercase leading-none text-ink">
            Counted on Solana, not by us
          </h2>
        </div>
        <div className="mx-auto mt-9 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="bg-surface px-4 py-7 text-center">
              <div className="font-display text-[clamp(2rem,4.6vw,3rem)] font-black leading-none tabular-nums text-ink">{s.n}</div>
              <div className="mt-2 font-mono text-[9.5px] uppercase tracking-wide text-muted">{s.l}</div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-5 max-w-lg text-center text-sm text-muted">
          Read live from this app&apos;s own program on devnet — not a marketing round number. Each one is a{" "}
          <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[.85em] text-ink">totalStampsIssued</code> or{" "}
          <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[.85em] text-ink">totalRedemptions</code>{" "}
          field on a real <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[.85em] text-ink">Business</code> account.
        </p>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const businesses = await getDirectorySafely();
  const top = businesses.slice(0, 10);

  return (
    <div>
      <section className="hero-ground relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14">
            <div>
              <h1 className="text-balance text-[clamp(2.75rem,7vw,9rem)] font-extrabold uppercase leading-[0.88] text-ink">
                Stamp cards you actually own.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink sm:text-xl">
                Passdari puts every stamp card and reward on Solana. Nothing to download, no wallet to install, and every stamp can be checked by anyone.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/customer" className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-stamp-blue px-7 font-display text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_8px_22px_-8px_rgba(61,92,255,.6)] hover:bg-stamp-blue-deep sm:min-h-[60px] sm:text-2xl">
                  <ArrowRightIcon size={20} /> I&apos;m a customer
                </Link>
                <Link href="/merchant" className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full border-[2.5px] border-ink px-7 font-display text-lg font-extrabold uppercase tracking-wide text-ink hover:bg-ink hover:text-ground sm:min-h-[60px] sm:text-2xl">
                  I&apos;m a merchant
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted">No wallet app and no SOL needed. Just a username and password.</p>
            </div>
            <div className="mx-auto w-full max-w-sm lg:mx-0">
              <HeroScanDemo />
            </div>
          </div>
        </div>
      </section>

      <section className="band-raised pb-2 pt-10 lg:pt-14">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center font-mono text-[10.5px] uppercase tracking-[.16em] text-[var(--accent-cyan)]">Registered shops</p>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted">
            Real shops, ranked by stamps actually given — read straight off Solana.
          </p>
        </div>
        <div className="mt-6 pb-10">
          <ShopMarquee shops={top} />
        </div>
      </section>

      <DirectoryGrid businesses={businesses} />

      <section className="mx-auto max-w-6xl px-4 py-14 lg:py-16" aria-labelledby="features">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-muted">Itemised</p>
          <h2 id="features" className="mt-2 text-balance text-[clamp(1.65rem,3.6vw,2.4rem)] font-extrabold uppercase leading-none text-ink">
            What the dApp actually does
          </h2>
          <p className="mt-3 text-base text-ink">Every line below is built and running on devnet today, not planned.</p>
        </div>
        <div className="mt-10 grid gap-x-12 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="border-b border-dashed border-line py-4">
              <div className="flex items-baseline gap-2.5">
                <span className="shrink-0 font-mono text-[9.5px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-[1.05rem] font-extrabold uppercase leading-tight text-ink">{f.title}</h3>
                <span className="-translate-y-0.5 min-w-3 flex-1 border-b border-dotted border-line-strong/40" />
                <span className="shrink-0 rounded-full border border-stamp-blue/35 px-1.5 py-[1px] font-mono text-[8.5px] uppercase tracking-wide text-stamp-blue">{f.tag}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 lg:py-16" aria-labelledby="how-it-works">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start lg:gap-14">
          <h2 id="how-it-works" className="text-balance text-[clamp(2rem,5vw,4rem)] font-extrabold uppercase leading-[0.98] text-ink">
            From a purchase to a reward, all on-chain
          </h2>
          <HowItWorksReceipt />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 lg:items-start">
          <div>
            <h2 className="text-balance text-[clamp(2rem,4.5vw,3.625rem)] font-extrabold uppercase leading-[0.98] text-ink">
              It feels like a normal login. Underneath, it&apos;s your own wallet.
            </h2>
            <p className="mt-4 max-w-md text-base text-ink">
              You sign up with a username and password, but nothing is stored on our side. Your browser creates a real Solana wallet, locks it with your password, and signs everything you do. We only pay the network fees.
            </p>
          </div>
          <WalletExplainer heading="It looks like a normal login. It isn&apos;t." />
        </div>
      </section>

      <StatsBand businesses={businesses} />

      {/* Light: the original dramatic treatment, black band with yellow text (.band-invert resolves
          that from --ink/--paper, which are still the near-black/yellow pair here). Dark: --ink and
          --paper are both light, so inverting them would do nothing — a raised panel instead, same idea
          as StatsBand just above. */}
      <section className="band-invert">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-14 sm:py-16">
          <p className="band-invert-eyebrow font-mono text-sm font-semibold uppercase tracking-[.08em]">Verify it yourself</p>
          <h2 className="text-balance text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.98]">
            Don&apos;t take our word for it
          </h2>
          <p className="band-invert-sub max-w-2xl text-lg">
            Open the program on Solana Explorer, then look up any card, voucher or receipt address shown in the app. The data there is exactly what you see on screen.
          </p>
          <div className="mt-1"><OnChainId address={PROGRAM_ID} label="Program" full /></div>
        </div>
      </section>
    </div>
  );
}
