"use client";

import { Button } from "@/components/ui/Button";
import { Receipt } from "@/components/ui/Receipt";
import { WalletExplainer } from "@/components/WalletExplainer";

type Props = {
  role: "customer" | "merchant";
  username: string; onUsername: (v: string) => void;
  password: string; onPassword: (v: string) => void;
  onSignUp: () => void; onSignIn: () => void;
  error: string | null;
  showRecovery: boolean; onToggleRecovery: () => void;
  recoveryUsername: string; onRecoveryUsername: (v: string) => void;
  recoveryPhrase: string; onRecoveryPhrase: (v: string) => void;
  recoveryPassword: string; onRecoveryPassword: (v: string) => void;
  onRecover: () => void; recoveryError: string | null;
};

// The sign-up / sign-in / recovery screen, shared by the customer and the merchant pages.
export function AuthPanel(p: Props) {
  const customer = p.role === "customer";
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-10">
      <Receipt className="px-6 pb-5 pt-6">
        <h1 className="text-balance text-[2.5rem] leading-[0.98] text-ink">
          {customer ? "Your stamp cards, in your own wallet" : "Run your loyalty programme on Solana"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {customer ? "Sign up to start collecting stamps, or sign in to pick up where you left off." : "Register your business, issue receipts and redeem rewards."}
        </p>

        <form className="mt-5 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); p.onSignIn(); }}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-username" className="eyebrow">Username</label>
            <input id="auth-username" className="field" autoComplete="username" value={p.username} onChange={(e) => p.onUsername(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-password" className="eyebrow">Password</label>
            <input id="auth-password" type="password" className="field" autoComplete="current-password" value={p.password} onChange={(e) => p.onPassword(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" onClick={p.onSignUp}>Sign up</Button>
            <Button size="lg" type="submit" variant="outline">Sign in</Button>
          </div>
          {p.error && <p role="alert" className="err">{p.error}</p>}
        </form>

        <button type="button" onClick={p.onToggleRecovery} aria-expanded={p.showRecovery}
          className="mt-4 text-sm font-bold text-ink underline decoration-2 underline-offset-4 hover:decoration-stamp-blue">
          {p.showRecovery ? "Hide recovery" : "Forgot your password? Recover your account"}
        </button>

        {p.showRecovery && (
          <div className="mt-4 flex flex-col gap-4 rounded-xl border-[2.5px] border-dashed border-ink p-4">
            <h2 className="text-xl text-ink">Recover your account</h2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rec-username" className="eyebrow">Username to recover</label>
              <input id="rec-username" className="field" value={p.recoveryUsername} onChange={(e) => p.onRecoveryUsername(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rec-phrase" className="eyebrow">Your 12-word phrase</label>
              <textarea id="rec-phrase" rows={2} className="field font-mono text-sm" value={p.recoveryPhrase} onChange={(e) => p.onRecoveryPhrase(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rec-password" className="eyebrow">New password</label>
              <input id="rec-password" type="password" className="field" autoComplete="new-password" value={p.recoveryPassword} onChange={(e) => p.onRecoveryPassword(e.target.value)} />
            </div>
            <Button onClick={p.onRecover}>Recover account</Button>
            {p.recoveryError && <p role="alert" className="err">{p.recoveryError}</p>}
          </div>
        )}
      </Receipt>

      <WalletExplainer />
    </div>
  );
}
