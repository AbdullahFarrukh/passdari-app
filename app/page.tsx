import Link from "next/link";
import { PROGRAM_ID } from "@/lib/explorer";
import { OnChainId } from "@/components/ui/OnChainId";
import { WalletExplainer } from "@/components/WalletExplainer";
import { ArrowRightIcon } from "@/components/ui/icons";

const STEPS = [
  { n: "1", label: "Receipt", status: "Issued", text: "The merchant issues a one-time receipt as an account on Solana. It expires if nobody claims it." },
  { n: "2", label: "Stamp", status: "Claimed", text: "Claiming closes the receipt and adds a stamp to your card. Nobody can claim the same receipt twice." },
  { n: "3", label: "Voucher", status: "Minted (NFT)", text: "Spend your stamps and you receive a Token-2022 NFT that you can present, keep or gift." },
  { n: "4", label: "Redeem", status: "Burned", text: "The merchant redeems it and the token is burned, so a voucher can never be used twice." },
];

// Decorative, non-scannable bar widths — visual texture only, no data encoded.
const BARCODE_A = [2, 4, 1, 1, 1, 2, 1, 4, 2, 1, 4, 2, 3, 2, 2, 2, 4, 3, 4, 1, 3, 2, 4, 2, 1, 1, 2, 4, 4, 2, 3, 2, 4, 2, 1, 3, 2];
const BARCODE_B = [4, 2, 4, 1, 1, 1, 3, 3, 2, 1, 4, 3, 1, 1, 4, 2, 3, 2, 3, 3, 4, 1, 1, 4, 4, 4, 1, 3, 4, 3, 2, 1, 3, 1, 2, 4, 3, 2, 3, 1];

function Barcode({ bars, width, height }: { bars: number[]; width: number; height: number }) {
  const gap = 3;
  let x = 0;
  const rects = bars.map((w, i) => {
    const rect = <rect key={i} x={x} y={0} width={w} height={height} fill="#111111" />;
    x += w + gap;
    return rect;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block">
      {rects}
    </svg>
  );
}

// The receipt card that stands in for a real one, printed straight onto the counter.
function ReceiptCard() {
  return (
    <div className="relative" aria-hidden="true">
      <span className="thump-in-alt absolute -right-3.5 -top-4 z-10 rotate-[7deg] rounded-md border-4 border-stamp-blue bg-paper px-3 py-0.5 font-display text-lg font-extrabold uppercase tracking-wide text-stamp-blue opacity-95">
        On-chain
      </span>
      <div className="tear-t" />
      <div className="bg-surface px-6 pb-2 pt-5 sm:px-7">
        <p className="text-center font-mono text-[10.5px] tracking-[.12em] text-muted">PASSDARI · LOYALTY CARD</p>
        <p className="mt-2 text-center font-display text-4xl font-extrabold uppercase leading-none text-ink sm:text-5xl">Blue Door Cafe</p>
        <p className="mt-1 text-center font-mono text-xs uppercase text-ink">Free coffee</p>

        <div className="mt-4 flex items-baseline gap-2 font-mono text-xs uppercase">
          <span className="font-bold text-ink">Stamps</span>
          <span className="min-w-3 flex-1 -translate-y-1 border-b-2 border-dotted border-line-strong/40" />
          <span className="font-bold text-ink">7 / 10</span>
        </div>
        <div className="my-3 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={
                i < 7
                  ? `flex aspect-square items-center justify-center bg-ink text-paper ${i === 6 ? "print-in" : ""}`
                  : "aspect-square border-2 border-dashed border-line-strong/60"
              }
            >
              {i < 7 && (
                <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
          ))}
        </div>

        <div className="flex items-baseline gap-2 font-mono text-xs uppercase">
          <span className="text-ink">Card NFT</span>
          <span className="min-w-3 flex-1 -translate-y-1 border-b-2 border-dotted border-line-strong/40" />
          <span className="font-bold text-ink">In your wallet</span>
        </div>
        <p className="mt-1 font-mono text-[10.5px] uppercase text-muted">Can&apos;t be sent to anyone else. Burned when you cash in.</p>

        <div className="mt-2 flex items-baseline gap-2 font-mono text-xs uppercase">
          <span className="text-ink">Card</span>
          <span className="min-w-3 flex-1 -translate-y-1 border-b-2 border-dotted border-line-strong/40" />
          <span className="font-bold text-ink">4EfY…b6wt</span>
        </div>
        <div className="flex items-baseline gap-2 font-mono text-xs uppercase">
          <span className="text-ink">NFT</span>
          <span className="min-w-3 flex-1 -translate-y-1 border-b-2 border-dotted border-line-strong/40" />
          <span className="font-bold text-ink">8qsC…bjbQ</span>
        </div>

        <div className="my-3 flex justify-center">
          <Barcode bars={BARCODE_A} width={230} height={32} />
        </div>
        <p className="pb-1.5 text-center font-mono text-[10.5px] uppercase tracking-[.14em] text-ink">*** Thank you ***</p>
      </div>
      <div className="tear-b" />
    </div>
  );
}

// "Your receipt": the app's own explanation, printed as one, with a line per step.
function HowItWorksReceipt() {
  return (
    <div>
      <div className="tear-t" />
      <div className="bg-surface px-6 pb-2 pt-5 sm:px-8">
        <p className="text-center font-mono text-[10.5px] tracking-[.14em] text-muted">PASSDARI · HOW IT WORKS</p>
        <p className="mt-1.5 text-center font-display text-3xl font-extrabold uppercase text-ink">Your receipt</p>

        <div className="mt-4 flex flex-col gap-3.5">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="flex items-baseline gap-2 font-mono text-sm font-bold uppercase">
                <span>{s.n} {s.label}</span>
                <span className="min-w-3 flex-1 -translate-y-1 border-b-2 border-dotted border-line-strong/40" />
                <span>{s.status}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-baseline gap-2 border-t-2 border-line pt-2.5 font-mono text-sm font-bold uppercase">
          <span>Total</span>
          <span className="min-w-3 flex-1 -translate-y-1 border-b-2 border-dotted border-line-strong/40" />
          <span>1 Free coffee</span>
        </div>
        <div className="my-3 flex justify-center">
          <Barcode bars={BARCODE_B} width={250} height={34} />
        </div>
      </div>
      <div className="tear-b" />
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      <section className="ledger-lines">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-14 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14 lg:py-20">
          <div>
            <h1 className="text-balance text-[clamp(2.75rem,7vw,9rem)] font-extrabold uppercase leading-[0.88] text-ink">
              Stamp cards you actually own.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink sm:text-xl">
              Passdari puts every stamp card and reward on Solana. Nothing to download, no wallet to install, and every stamp can be checked by anyone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/customer" className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-ink px-7 font-display text-lg font-extrabold uppercase tracking-wide text-paper hover:bg-ink-deep sm:min-h-[60px] sm:text-2xl">
                <ArrowRightIcon size={20} /> I&apos;m a customer
              </Link>
              <Link href="/merchant" className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full border-[2.5px] border-ink px-7 font-display text-lg font-extrabold uppercase tracking-wide text-ink hover:bg-ink hover:text-paper sm:min-h-[60px] sm:text-2xl">
                I&apos;m a merchant
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink">No wallet app and no SOL needed. Just a username and password.</p>
          </div>
          <div className="mx-auto w-full max-w-sm lg:mx-0">
            <ReceiptCard />
          </div>
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

      <section className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-14 sm:py-16">
          <p className="font-mono text-sm font-semibold uppercase tracking-[.08em] text-paper">Verify it yourself</p>
          <h2 className="text-balance text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.98] text-paper">
            Don&apos;t take our word for it
          </h2>
          <p className="max-w-2xl text-lg text-[#F3F0B8]">
            Open the program on Solana Explorer, then look up any card, voucher or receipt address shown in the app. The data there is exactly what you see on screen.
          </p>
          <div className="mt-1"><OnChainId address={PROGRAM_ID} label="Program" full /></div>
        </div>
      </section>
    </div>
  );
}
