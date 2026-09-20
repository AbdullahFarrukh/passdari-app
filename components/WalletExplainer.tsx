import { KeyIcon, LockIcon, ShieldIcon } from "@/components/ui/icons";

// The most interesting thing about this app is invisible: it looks like a username and password, but
// it is a real self-custodial Solana wallet living in the person's own browser. This says so, plainly.
// Every claim here matches the code in lib/customerAuth.ts and lib/merchantAuth.ts.
const STEPS = [
  { icon: KeyIcon, title: "Your browser creates a Solana wallet", text: "A 12-word phrase generates your key pair right here, on your device." },
  { icon: LockIcon, title: "Your password locks it", text: "The secret key is encrypted with your password and stays in this browser. Passdari's servers never see it." },
  { icon: ShieldIcon, title: "You sign, we pay the fees", text: "Every stamp and reward is signed by you. Passdari's relayer covers the network fee, so you never need SOL." },
];

export function WalletExplainer({ heading = "It looks like a normal login. It isn't." }: { heading?: string }) {
  return (
    <section aria-labelledby="wallet-explainer" className="surface p-5 sm:p-6">
      <p className="eyebrow mb-2">Self-custody</p>
      <h2 id="wallet-explainer" className="text-lg font-semibold text-ink">{heading}</h2>
      <ol className="mt-4 flex flex-col gap-4">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-paper-2 text-ink"><Icon size={18} /></span>
            <div>
              <p className="text-sm font-medium"><span className="font-mono text-muted">{i + 1}.</span> {title}</p>
              <p className="mt-0.5 text-sm text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 border-t border-line pt-3 font-mono text-xs text-muted">
        ed25519 keys · BIP-39 phrase · PBKDF2 + AES-GCM encryption
      </p>
    </section>
  );
}
