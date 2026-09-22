import Link from "next/link";
import { PROGRAM_ID } from "@/lib/explorer";
import { OnChainId } from "@/components/ui/OnChainId";
import { WalletExplainer } from "@/components/WalletExplainer";
import { Receipt } from "@/components/ui/Receipt";
import { ReceiptRow } from "@/components/ui/ReceiptRow";
import { LoyaltyCardReceipt } from "@/components/ui/LoyaltyCardReceipt";
import { Barcode, BARCODE_B } from "@/components/ui/Barcode";
import { ArrowRightIcon } from "@/components/ui/icons";

const STEPS = [
  { n: "1", label: "Receipt", status: "Issued", text: "The merchant issues a one-time receipt as an account on Solana. It expires if nobody claims it." },
  { n: "2", label: "Stamp", status: "Claimed", text: "Claiming closes the receipt and adds a stamp to your card. Nobody can claim the same receipt twice." },
  { n: "3", label: "Voucher", status: "Minted (NFT)", text: "Spend your stamps and you receive a Token-2022 NFT that you can present, keep or gift." },
  { n: "4", label: "Redeem", status: "Burned", text: "The merchant redeems it and the token is burned, so a voucher can never be used twice." },
];

// The receipt card that stands in for a real one, printed straight onto the counter.
function ExampleCard() {
  return (
    <div className="relative" aria-hidden="true">
      <span className="thump-in-alt absolute -right-3.5 -top-4 z-10 rotate-[7deg] rounded-md border-4 border-stamp-blue bg-paper px-3 py-0.5 font-display text-lg font-extrabold uppercase tracking-wide text-stamp-blue opacity-95">
        On-chain
      </span>
      <LoyaltyCardReceipt
        businessName="Blue Door Cafe"
        rewardLabel="Free coffee"
        stamps={7}
        stampsRequired={10}
        cardAddress="4EfYb1c2wPk8mV3f9qLxDzT6hR2sYnWo1eJb4pXmAb6wt"
        cardNft={{ mint: "8qsCz3Km5tWyR7vB2nXpLfQd9uHa1sYo6eDm4wKbjbQ", held: true }}
        interactive={false}
      />
    </div>
  );
}

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
            <ExampleCard />
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
