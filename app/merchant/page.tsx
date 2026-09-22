"use client";

import { useState, useEffect } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { signUp, signIn, recoverAccount } from "@/lib/merchantAuth";
import { useCustomerProgram } from "@/lib/customerProgram";
import { RegisterBusinessForm } from "@/components/RegisterBusinessForm";
import { MerchantDashboard } from "@/components/MerchantDashboard";
import { TopCustomers } from "@/components/TopCustomers";
import { Button } from "@/components/ui/Button";
import { NewSaleForm } from "@/components/NewSaleForm";
import { PresentedVouchers } from "@/components/PresentedVouchers";
import { MerchantCopilot } from "@/components/MerchantCopilot";
import { Housekeeping } from "@/components/Housekeeping";
import { AuthPanel } from "@/components/AuthPanel";
import { AccountBar } from "@/components/AccountBar";
import { MnemonicNotice } from "@/components/MnemonicNotice";

const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

export default function MerchantPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [newMnemonic, setNewMnemonic] = useState<string | null>(null);

  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const [myBusiness, setMyBusiness] = useState<any | null | "checking">("checking");
  const [refreshKey, setRefreshKey] = useState(0);
  const program = useCustomerProgram(keypair);

  // `quiet` refreshes the numbers in place. Without it the whole dashboard is replaced by "Checking your account…"
  // while it reloads, which also throws away anything on screen (like a receipt's QR code that is still being scanned).
  const checkForBusiness = (quiet = false) => {
    if (!program || !keypair) return;
    if (!quiet) setMyBusiness("checking");

    const [businessPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("business"), keypair.publicKey.toBuffer()],
      program.programId
    );

    program.account.business
      .fetch(businessPda)
      .then((account) => setMyBusiness(account))
      .catch(() => {
        if (!quiet) setMyBusiness(null);
      });
  };

  useEffect(checkForBusiness, [program, keypair]);

  async function handleSignUp() {
    setAuthError(null);
    setKeypair(null);
    setNewMnemonic(null);
    try {
      const { keypair: kp, mnemonic } = await signUp(username, password);
      setKeypair(kp);
      setNewMnemonic(mnemonic);
    } catch (err) {
      console.error("Sign up failed:", err);
      setAuthError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleSignIn() {
    setAuthError(null);
    setKeypair(null);
    try {
      setKeypair(await signIn(username, password));
    } catch (err) {
      console.error("Sign in failed:", err);
      setAuthError("Incorrect username or password.");
    }
  }

  async function handleRecover() {
    setRecoveryError(null);
    try {
      const kp = await recoverAccount(recoveryUsername, recoveryPhrase, recoveryPassword);
      setKeypair(kp);
      setUsername(recoveryUsername);
      setShowRecovery(false);
      setRecoveryUsername("");
      setRecoveryPhrase("");
      setRecoveryPassword("");
    } catch (err) {
      console.error("Recovery failed:", err);
      setRecoveryError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function handleSignOut() {
    setKeypair(null);
    setUsername("");
    setPassword("");
    setNewMnemonic(null);
    setAuthError(null);
    setMyBusiness("checking");
  }

  async function handleLowerThreshold() {
    if (!program || !keypair || !myBusiness || myBusiness === "checking") return;

    const [businessPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("business"), keypair.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .updateBusinessConfig(myBusiness.rewardLabel, 1, myBusiness.minPurchaseAmount, myBusiness.receiptTtlSeconds)
      .accounts({ business: businessPda, authority: keypair.publicKey })
      .transaction();

    tx.feePayer = RELAYER_PUBLIC_KEY;
    const { blockhash } = await program.provider.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.partialSign(keypair);

    const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");
    await fetch("/api/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: serialized }),
    });

    checkForBusiness();
  }

  return (
    <div className="text-charcoal flex flex-col items-center py-8 px-4 gap-6">
      {!keypair && (
        <AuthPanel
          role="merchant"
          username={username} onUsername={setUsername}
          password={password} onPassword={setPassword}
          onSignUp={handleSignUp} onSignIn={handleSignIn}
          error={authError}
          showRecovery={showRecovery} onToggleRecovery={() => setShowRecovery((s) => !s)}
          recoveryUsername={recoveryUsername} onRecoveryUsername={setRecoveryUsername}
          recoveryPhrase={recoveryPhrase} onRecoveryPhrase={setRecoveryPhrase}
          recoveryPassword={recoveryPassword} onRecoveryPassword={setRecoveryPassword}
          onRecover={handleRecover} recoveryError={recoveryError}
        />
      )}

      {keypair && (
        <AccountBar username={username} address={keypair.publicKey.toBase58()} onSignOut={handleSignOut} />
      )}

      {newMnemonic && <MnemonicNotice phrase={newMnemonic} onDismiss={() => setNewMnemonic(null)} />}

      {keypair && myBusiness === "checking" && (
        <p className="text-sm text-charcoal/60 font-mono">Checking your account…</p>
      )}

              {keypair && myBusiness === null && (
          <RegisterBusinessForm
            keypair={keypair}
            onDone={() => {
              setNewMnemonic(null);
              checkForBusiness();
            }}
          />
        )}

      {keypair && myBusiness && myBusiness !== "checking" && (
        <div className="flex w-full max-w-6xl flex-col gap-6">
          <MerchantDashboard program={program} business={myBusiness} keypair={keypair} />

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <NewSaleForm
                keypair={keypair}
                minPurchaseMinor={Number(myBusiness.minPurchaseAmount.toString())}
                ttlSeconds={Number(myBusiness.receiptTtlSeconds)}
                onDone={checkForBusiness}
              />
              <PresentedVouchers
                keypair={keypair}
                refreshKey={refreshKey}
                onChange={() => {
                  setRefreshKey((k) => k + 1);
                  // The presented list checks every few seconds, so the headline numbers stay live too.
                  checkForBusiness(true);
                }}
                onRedeem={() => {
                  setRefreshKey((k) => k + 1);
                  checkForBusiness(true);
                }}
              />
            </div>

            <div className="flex flex-col gap-6">
              <TopCustomers program={program} keypair={keypair} />
              <Housekeeping keypair={keypair} />
              <details className="text-sm text-muted">
                <summary className="cursor-pointer select-none py-1 hover:text-ink">Demo tools</summary>
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={handleLowerThreshold}>
                    Lower reward threshold to 1
                  </Button>
                </div>
              </details>
            </div>
          </div>

          <MerchantCopilot keypair={keypair} />
        </div>
      )}
    </div>
  );
}