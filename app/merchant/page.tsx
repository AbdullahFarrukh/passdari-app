"use client";

import { useState, useEffect } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { signUp, signIn, recoverAccount } from "@/lib/merchantAuth";
import { useCustomerProgram } from "@/lib/customerProgram";
import { RegisterBusinessForm } from "@/components/RegisterBusinessForm";
import { MerchantDashboard } from "@/components/MerchantDashboard";
import { NewSaleForm } from "@/components/NewSaleForm";
import { PresentedVouchers } from "@/components/PresentedVouchers";
import { MerchantCopilot } from "@/components/MerchantCopilot";
import { ReclaimExpiredReceipts } from "@/components/ReclaimExpiredReceipts";

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

  const checkForBusiness = () => {
    if (!program || !keypair) return;
    setMyBusiness("checking");

    const [businessPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("business"), keypair.publicKey.toBuffer()],
      program.programId
    );

    program.account.business
      .fetch(businessPda)
      .then((account) => setMyBusiness(account))
      .catch(() => setMyBusiness(null));
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
    <div className="min-h-screen bg-paper text-charcoal flex flex-col items-center py-10 px-8 gap-6">
      {!keypair && (
        <div className="flex flex-col items-center gap-2 w-full max-w-sm mt-16">
                    <p className="font-mono text-lg text-ink mb-2">Passdari — Merchant</p>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 bg-white/60"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 bg-white/60"
          />
          <div className="flex gap-2 w-full">
            <button
              className="flex-1 bg-ink text-paper rounded-md py-2 text-sm font-medium"
              onClick={handleSignUp}
            >
              Sign up
            </button>
            <button
              className="flex-1 border border-ink text-ink rounded-md py-2 text-sm font-medium"
              onClick={handleSignIn}
            >
              Sign in
            </button>
          </div>
          <button
            className="text-xs text-charcoal/60 underline"
            onClick={() => setShowRecovery((s) => !s)}
          >
            Forgot password?
          </button>
          {authError && <p className="text-stamp-red text-sm">{authError}</p>}

          {showRecovery && (
            <div className="flex flex-col items-center gap-2 border-t border-line pt-4 w-full mt-2">
              <p className="text-sm font-semibold text-ink">Recover your account</p>
              <input
                placeholder="Username to recover"
                value={recoveryUsername}
                onChange={(e) => setRecoveryUsername(e.target.value)}
                className="w-full border border-line rounded-md px-3 py-2 bg-white/60"
              />
              <textarea
                placeholder="Your 12-word phrase"
                value={recoveryPhrase}
                onChange={(e) => setRecoveryPhrase(e.target.value)}
                className="w-full border border-line rounded-md px-3 py-2 bg-white/60 font-mono text-sm"
                rows={2}
              />
              <input
                placeholder="New password"
                type="password"
                value={recoveryPassword}
                onChange={(e) => setRecoveryPassword(e.target.value)}
                className="w-full border border-line rounded-md px-3 py-2 bg-white/60"
              />
              <button
                className="w-full bg-ink text-paper rounded-md py-2 text-sm font-medium"
                onClick={handleRecover}
              >
                Recover account
              </button>
              {recoveryError && <p className="text-stamp-red text-sm">{recoveryError}</p>}
            </div>
          )}
        </div>
      )}

      {keypair && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium">Signed in as {username}</p>
          <p className="text-xs text-charcoal/50 font-mono">{keypair.publicKey.toBase58()}</p>
          <button className="text-xs text-charcoal/60 underline" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      )}

      {newMnemonic && (
        <div className="border-2 border-stamp-red rounded-lg p-3 max-w-sm text-sm bg-white/60">
          <p className="font-semibold text-stamp-red mb-2">
            Write these 12 words down now. This is the only time they will ever be shown.
          </p>
          <p className="font-mono break-words">{newMnemonic}</p>
        </div>
      )}

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
        <>
          <MerchantDashboard program={program} business={myBusiness} keypair={keypair} />

          <NewSaleForm
            keypair={keypair}
            minPurchaseMinor={Number(myBusiness.minPurchaseAmount.toString())}
            onDone={checkForBusiness}
          />

          <MerchantCopilot keypair={keypair} />
                    <ReclaimExpiredReceipts keypair={keypair} />

          <PresentedVouchers
            keypair={keypair}
            refreshKey={refreshKey}
            onChange={() => setRefreshKey((k) => k + 1)}
            onRedeem={() => {
              setRefreshKey((k) => k + 1);
              checkForBusiness();
            }}
          />

          <button onClick={handleLowerThreshold} className="text-xs text-charcoal/40 underline">
            Lower reward threshold to 1 (testing only)
          </button>
        </>
      )}
    </div>
  );
}