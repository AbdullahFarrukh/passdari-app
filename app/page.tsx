import Link from "next/link";
import { CLUSTER_LABEL, PROGRAM_ID } from "@/lib/explorer";
import { OnChainId } from "@/components/ui/OnChainId";
import { WalletExplainer } from "@/components/WalletExplainer";
import { ArrowRightIcon, FlameIcon, QrIcon, ReceiptIcon, ShieldIcon, TicketIcon } from "@/components/ui/icons";

const STEPS = [
  { icon: ReceiptIcon, title: "A sale creates a receipt", text: "The merchant issues a one-time receipt as an account on Solana. It expires if nobody claims it.", tag: "Receipt account" },
  { icon: QrIcon, title: "You scan it and get a stamp", text: "Claiming closes the receipt and adds a stamp to your card. Nobody can claim the same receipt twice.", tag: "Card account" },
  { icon: TicketIcon, title: "A full card becomes an NFT voucher", text: "Spend your stamps and you receive a Token-2022 NFT that you can present, keep or gift.", tag: "Voucher NFT" },
  { icon: FlameIcon, title: "Redeeming burns it", text: "The merchant redeems it and the token is burned, so a voucher can never be used twice.", tag: "Burned on redeem" },
];

// A decorative card, drawn to look like the real ones inside the app.
function ExampleCard() {
  return (
    <div className="surface relative p-6 shadow-[0_3px_0_var(--line)]" aria-hidden="true">
      <span className="absolute right-5 top-5 -rotate-6 rounded-md border-2 border-stamp-red px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-stamp-red">
        On-chain
      </span>
      <p className="eyebrow">Example card</p>
      <p className="mt-1 font-mono text-xl font-semibold text-ink">Blue Door Cafe</p>
      <div className="mt-5 grid grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`aspect-square rounded-full border-2 ${i < 7 ? "border-stamp-red bg-stamp-red/90 shadow-[inset_0_0_0_4px_var(--surface)]" : "border-dashed border-line-strong"}`} />
        ))}
      </div>
      <p className="mt-4 text-sm text-muted"><span className="font-mono font-semibold text-ink">7 / 10</span> stamps · Free coffee</p>
      <p className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-xs text-verified">
        <ShieldIcon size={16} /> Every stamp is signed by the customer and recorded on Solana
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      <section className="ledger-lines border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="eyebrow mb-3">Loyalty on Solana · {CLUSTER_LABEL}</p>
            <h1 className="text-balance text-4xl font-semibold leading-tight text-ink sm:text-5xl">Stamp cards you actually own.</h1>
            <p className="mt-4 max-w-xl text-lg text-charcoal/80">
              Passdari puts every stamp card and reward on Solana. Nothing to download, no wallet to install, and every stamp can be checked by anyone.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/customer" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-5 text-sm font-medium text-paper hover:bg-ink-deep">
                I&apos;m a customer <ArrowRightIcon />
              </Link>
              <Link href="/merchant" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-ink px-5 text-sm font-medium text-ink hover:bg-ink/5">
                I&apos;m a merchant
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">No wallet app and no SOL needed. Just a username and password.</p>
          </div>
          <ExampleCard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="how-it-works">
        <p className="eyebrow mb-2">How it works</p>
        <h2 id="how-it-works" className="text-2xl font-semibold text-ink">From a purchase to a reward, all on-chain</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text, tag }, i) => (
            <li key={title} className="surface flex flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-paper-2 text-ink"><Icon size={20} /></span>
                <span className="font-mono text-sm text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-muted">{text}</p>
              <span className="eyebrow mt-4 w-fit rounded-md border border-line px-2 py-1">{tag}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-paper-2/60">
        <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Yours, not ours</p>
            <h2 className="text-2xl font-semibold text-ink">It feels like a normal login. Underneath, it&apos;s your own wallet.</h2>
            <p className="mt-3 text-muted">
              You sign up with a username and password, but nothing is stored on our side. Your browser creates a real Solana wallet, locks it with your password, and signs everything you do. We only pay the fees.
            </p>
          </div>
          <WalletExplainer heading="What happens when you sign up" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="verify">
        <div className="surface flex flex-col gap-4 p-6 sm:p-8">
          <p className="eyebrow">Verify it yourself</p>
          <h2 id="verify" className="text-2xl font-semibold text-ink">Don&apos;t take our word for it</h2>
          <p className="max-w-2xl text-muted">
            Open the program on Solana Explorer, then look up any card, voucher or receipt address shown in the app. The data there is exactly what you see on screen.
          </p>
          <div><OnChainId address={PROGRAM_ID} label="Program" full /></div>
        </div>
      </section>
    </div>
  );
}
