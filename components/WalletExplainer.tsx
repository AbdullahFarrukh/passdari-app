import { Receipt } from "@/components/ui/Receipt";

// The most interesting thing about this app is invisible: it looks like a username and password, but
// it is a real self-custodial Solana wallet living in the person's own browser. This says so, plainly.
// Every claim here matches the code in lib/customerAuth.ts and lib/merchantAuth.ts.
const STEPS = [
  { title: "Your browser creates a Solana wallet", text: "A 12-word phrase generates your key pair right here, on your device." },
  { title: "Your password locks it", text: "The secret key is encrypted with your password and stays in this browser. Passdari's servers never see it." },
  { title: "You sign, we pay the fees", text: "Every stamp and reward is signed by you. Passdari's relayer covers the network fee, so you never need SOL." },
];

export function WalletExplainer({ heading = "It looks like a normal login. It isn't." }: { heading?: string }) {
  return (
    <section aria-labelledby="wallet-explainer">
      <Receipt className="px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
        <h2 id="wallet-explainer" className="text-2xl text-ink">{heading}</h2>
        <ol className="mt-4 flex flex-col gap-3.5">
          {STEPS.map(({ title, text }, i) => (
            <li key={title}>
              <p className="font-mono text-xs font-bold uppercase text-ink">{i + 1}. {title}</p>
              <p className="mt-0.5 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t-2 border-line pt-2.5 font-mono text-[10.5px] uppercase tracking-[.04em] text-muted">
          ed25519 keys · BIP-39 phrase · PBKDF2 + AES-GCM encryption
        </p>
      </Receipt>
    </section>
  );
}
