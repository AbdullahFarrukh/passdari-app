import Link from "next/link";
import { CLUSTER_LABEL } from "@/lib/explorer";

// The three dots echo the stamp row on a card: two stamped, one still to come.
function BrandMark() {
  return (
    <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true">
      <circle cx="5" cy="5" r="4" fill="#B81C0D" /><circle cx="13" cy="5" r="4" fill="#B81C0D" />
      <circle cx="21" cy="5" r="3.2" fill="none" stroke="#FFE600" strokeWidth="1.5" />
    </svg>
  );
}

export function TopBar() {
  return (
    <header className="bg-charcoal text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-2.5 sm:gap-x-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-extrabold uppercase tracking-wider">
          <BrandMark />
          PASSDARI
        </Link>
        <nav aria-label="Main" className="flex items-center gap-0.5 text-sm sm:gap-1">
          <Link href="/customer" className="rounded-md px-2 py-1.5 hover:bg-paper/10 sm:px-2.5">Customer</Link>
          <Link href="/merchant" className="rounded-md px-2 py-1.5 hover:bg-paper/10 sm:px-2.5">Merchant</Link>
        </nav>
        <span className="inline-flex items-center gap-2 rounded-full border border-paper/30 px-2.5 py-1 font-mono text-xs sm:px-3">
          <span className="size-2 rounded-full bg-[#34D264]" aria-hidden="true" />
          <span className="hidden sm:inline">Solana</span> {CLUSTER_LABEL}
        </span>
      </div>
    </header>
  );
}
