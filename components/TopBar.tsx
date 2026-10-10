import Link from "next/link";
import { CLUSTER_LABEL } from "@/lib/explorer";
import { ThemeToggle } from "@/components/ThemeToggle";

// The brand mark: a loyalty card one stamp from full — nine squares stamped, the tenth on the stem
// left open and dashed, same as the approved lockup (logo next to the wordmark), not the solid small
// variant that treatment used only for the favicon at 16px. Sized up a little from a first pass that
// used the solid version here too, so the open square has enough room to actually read.
function BrandMark() {
  return (
    <svg width="20" height="31" viewBox="0 0 60 94" fill="currentColor" aria-hidden="true">
      <rect x="2"    y="2"  width="16" height="16" rx="3" />
      <rect x="20.5" y="2"  width="16" height="16" rx="3" />
      <rect x="39"   y="2"  width="16" height="16" rx="3" />
      <rect x="2"    y="20.5" width="16" height="16" rx="3" />
      <rect x="39"   y="20.5" width="16" height="16" rx="3" />
      <rect x="2"    y="39" width="16" height="16" rx="3" />
      <rect x="20.5" y="39" width="16" height="16" rx="3" />
      <rect x="39"   y="39" width="16" height="16" rx="3" />
      <rect x="2"    y="57.5" width="16" height="16" rx="3" />
      <rect x="3" y="77" width="14" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" opacity=".55" />
    </svg>
  );
}

export function TopBar() {
  return (
    // A hairline border, same as Footer's own border-t: --charcoal and the page ground are both very
    // dark now, close enough in value that the bar needs more than a background difference to read as
    // a bar sitting on the page rather than fading into it.
    <header className="border-b border-paper/10 bg-charcoal text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-2.5 sm:gap-x-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-extrabold uppercase tracking-wider">
          <BrandMark />
          PASSDARI
        </Link>
        <nav aria-label="Main" className="flex items-center gap-0.5 text-sm sm:gap-1">
          <Link href="/customer" className="rounded-md px-2 py-1.5 hover:bg-paper/10 sm:px-2.5">Customer</Link>
          <Link href="/merchant" className="rounded-md px-2 py-1.5 hover:bg-paper/10 sm:px-2.5">Merchant</Link>
        </nav>
        {/* The ring is the Gotas "moving border" trick: a conic-gradient comet spinning behind a solid
            interior, clipped to 1px. It doubles as the only visual cue that this pill is a link — to
            solana.com, not to anything devnet-specific, since that is the one place "Solana" itself
            points. */}
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="https://solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="glow-ring rounded-full"
            aria-label={`Solana ${CLUSTER_LABEL} — visit solana.com (opens in a new tab)`}
          >
            <span className="glow-ring-content inline-flex items-center gap-2 rounded-full bg-charcoal px-2.5 py-1 font-mono text-xs text-paper transition-colors hover:bg-[#1c1c1c] sm:px-3">
              <span className="size-2 rounded-full bg-[#34D264]" aria-hidden="true" />
              <span className="hidden sm:inline">Solana</span> {CLUSTER_LABEL}
            </span>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
