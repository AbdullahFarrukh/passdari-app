import { explorerAddressUrl, shortAddress } from "@/lib/explorer";
import { Receipt } from "./Receipt";
import { ReceiptRow } from "./ReceiptRow";
import { Barcode, BARCODE_A } from "./Barcode";

// `interactive: false` renders a plain span instead of a link — for the home page's decorative
// example card, which sits inside an aria-hidden wrapper (a real link there would still be
// keyboard-focusable, and would point at a fake, non-existent address anyway).
function AddressValue({ address, interactive }: { address: string; interactive: boolean }) {
  if (!interactive) return <span title={address}>{shortAddress(address)}</span>;
  return (
    <a href={explorerAddressUrl(address)} target="_blank" rel="noopener noreferrer" className="hover:underline" title={address}>
      {shortAddress(address)}
    </a>
  );
}

// A stamp card, printed as a receipt: the same look for the decorative example on the home page and
// for a customer's real cards. Addresses are plain printed text on the paper, but still link out to
// Solana Explorer — the app's "verify it yourself" promise holds even inside the receipt.
export function LoyaltyCardReceipt({
  businessName,
  rewardLabel,
  stamps,
  stampsRequired,
  cardAddress,
  cardNft,
  interactive = true,
}: {
  businessName: string;
  rewardLabel: string;
  stamps: number;
  stampsRequired: number;
  cardAddress: string;
  cardNft: { mint: string; held: boolean } | null;
  interactive?: boolean;
}) {
  const filled = Math.min(stamps, stampsRequired);
  return (
    <Receipt className="px-6 pb-2 pt-5 sm:px-7">
      <p className="text-center font-mono text-[10.5px] tracking-[.12em] text-muted">PASSDARI · LOYALTY CARD</p>
      <p className="mt-2 text-center font-display text-4xl font-extrabold uppercase leading-none text-ink sm:text-5xl">{businessName}</p>
      <p className="mt-1 text-center font-mono text-xs uppercase text-ink">{rewardLabel}</p>

      <div className="mt-4">
        <ReceiptRow label="Stamps" value={`${filled} / ${stampsRequired}`} />
      </div>
      <div className="my-3 grid grid-cols-5 gap-2">
        {Array.from({ length: stampsRequired }).map((_, i) => (
          <span
            key={i}
            className={
              i < filled
                ? `flex aspect-square items-center justify-center bg-ink text-paper ${i === filled - 1 ? "print-in" : ""}`
                : "aspect-square border-2 border-dashed border-line-strong/60"
            }
          >
            {i < filled && (
              <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
        ))}
      </div>

      {cardNft && (
        <>
          <ReceiptRow label="Card NFT" value={cardNft.held ? "In your wallet" : "Not held right now"} />
          <p className="mt-1 font-mono text-[10.5px] uppercase text-muted">
            {cardNft.held
              ? "Can't be sent to anyone else. Burned when you cash in."
              : "No card NFT right now. Your next stamp brings one."}
          </p>
        </>
      )}

      <div className="mt-2">
        <ReceiptRow label="Card" value={<AddressValue address={cardAddress} interactive={interactive} />} />
      </div>
      {cardNft?.held && (
        <ReceiptRow label="NFT" value={<AddressValue address={cardNft.mint} interactive={interactive} />} />
      )}

      <div className="my-3 flex justify-center">
        <Barcode bars={BARCODE_A} width={230} height={32} />
      </div>
      <p className="pb-1.5 text-center font-mono text-[10.5px] uppercase tracking-[.14em] text-ink">*** Thank you ***</p>
    </Receipt>
  );
}
