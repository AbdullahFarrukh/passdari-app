import { PROGRAM_ID } from "@/lib/explorer";
import { OnChainId } from "@/components/ui/OnChainId";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper-2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <OnChainId address={PROGRAM_ID} label="Program" />
          <p className="max-w-md text-xs text-muted">
            Every card, voucher and receipt is an account you can inspect on Solana Explorer.
          </p>
        </div>
        <p className="text-xs text-muted">Your keys stay in your browser. Passdari&apos;s relayer pays the network fees.</p>
      </div>
    </footer>
  );
}
