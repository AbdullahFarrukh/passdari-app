"use client";

import { useState } from "react";
import { Keypair } from "@solana/web3.js";
import { signUp, signIn, recoverAccount } from "@/lib/merchantAuth";

export default function MerchantRelayerTestPage() {
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
      const kp = await signIn(username, password);
      setKeypair(kp);
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
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      {!keypair && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold">Merchant sign-up (no wallet extension)</p>
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={handleSignUp}>Sign up</button>
            <button onClick={handleSignIn}>Sign in</button>
          </div>
          <button className="text-xs text-gray-500 underline" onClick={() => setShowRecovery((s) => !s)}>
            Forgot password?
          </button>
          {authError && <p className="text-red-600 text-sm">{authError}</p>}

          {showRecovery && (
            <div className="flex flex-col items-center gap-2 border-t pt-4 w-full mt-2">
              <p className="text-sm font-semibold">Recover your account</p>
              <input
                placeholder="Username to recover"
                value={recoveryUsername}
                onChange={(e) => setRecoveryUsername(e.target.value)}
                className="w-full"
              />
              <textarea
                placeholder="Your 12-word phrase"
                value={recoveryPhrase}
                onChange={(e) => setRecoveryPhrase(e.target.value)}
                className="w-full"
                rows={2}
              />
              <input
                placeholder="New password"
                type="password"
                value={recoveryPassword}
                onChange={(e) => setRecoveryPassword(e.target.value)}
                className="w-full"
              />
              <button onClick={handleRecover}>Recover account</button>
              {recoveryError && <p className="text-red-600 text-sm">{recoveryError}</p>}
            </div>
          )}
        </div>
      )}

      {keypair && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold">Signed in as {username}</p>
          <p className="text-xs text-gray-500">{keypair.publicKey.toBase58()}</p>
          <button className="text-xs text-gray-500 underline" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      )}

      {newMnemonic && (
        <div className="border-2 border-red-500 rounded-lg p-3 max-w-sm text-sm">
          <p className="font-semibold text-red-600 mb-2">
            Write these 12 words down now. This is the only time they will ever be shown.
          </p>
          <p className="font-mono break-words">{newMnemonic}</p>
        </div>
      )}
    </div>
  );
}