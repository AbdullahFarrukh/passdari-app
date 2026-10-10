import type { ReactNode } from "react";
import { PROGRAM_ID } from "@/lib/explorer";
import { OnChainId } from "@/components/ui/OnChainId";

// GitHub, X and Instagram, drawn at the stroke weight the rest of the app's icons use. Kept here rather
// than in components/ui/icons.tsx: those are single-colour line icons that inherit `currentColor`, and
// these three are brand marks with their own fixed shapes — a different kind of icon, used in one place.
function GithubGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
function XGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z" />
    </svg>
  );
}
function InstagramGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="17.7" cy="6.3" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

// A real, working link to Passdari's own account on a platform: gets the glow-ring, same as the Solana
// pill in TopBar, because the ring is this app's visual shorthand for "this one actually goes somewhere."
function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      className="glow-ring rounded-xl">
      <span className="glow-ring-content flex size-10 items-center justify-center rounded-xl bg-charcoal text-paper transition-colors hover:bg-[#1c1c1c]">
        {children}
      </span>
    </a>
  );
}

// Not wired up yet. Shown anyway — so the footer's final shape is visible now rather than shifting
// later — but honestly: a dashed border and `aria-disabled` instead of a live link, and no glow-ring,
// because the ring means "this goes somewhere" and this one does not, yet.
function SocialPending({ label }: { label: string }) {
  return (
    <span role="link" aria-disabled="true" aria-label={`${label} — link to come`} title="Link to come"
      className="flex size-10 items-center justify-center rounded-xl border border-dashed border-paper/25 text-paper/50">
      {label === "X" ? <XGlyph /> : <InstagramGlyph />}
    </span>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-paper/10 bg-charcoal text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <OnChainId address={PROGRAM_ID} label="Program" />
          <p className="max-w-md text-xs text-paper/60">
            Every card, voucher and receipt is an account you can inspect on Solana Explorer.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SocialLink href="https://github.com/AbdullahFarrukh/passdari" label="Passdari on GitHub">
            <GithubGlyph />
          </SocialLink>
          <SocialPending label="X" />
          <SocialPending label="Instagram" />
        </div>
      </div>
      <div className="border-t border-paper/10">
        <p className="mx-auto max-w-6xl px-4 py-3 text-xs text-paper/60">
          Your keys stay in your browser. Passdari&apos;s relayer pays the network fees.
        </p>
      </div>
    </footer>
  );
}
