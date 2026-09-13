"use client";

import { useState, useEffect } from "react";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { signUp, signIn, recoverAccount } from "@/lib/customerAuth";
import { useCustomerProgram } from "@/lib/customerProgram";
import { translateError } from "@/lib/errorMessages";
import { MyCards } from "@/components/MyCards";
import { MyVouchers } from "@/components/MyVouchers";
import { BusinessDirectory } from "@/components/BusinessDirectory";
import { QrScanner } from "@/components/QrScanner";

const CLOCK_SYSVAR = new PublicKey("SysvarC1ock11111111111111111111111111111111");

async function getOnChainNow(connection: Connection): Promise<number> {
  const accountInfo = await connection.getAccountInfo(CLOCK_SYSVAR);
  if (!accountInfo) throw new Error("Could not read the on-chain clock");
  // The Clock sysvar's unix_timestamp is an i64, little-endian, at byte offset 32.
  return Number(accountInfo.data.readBigInt64LE(32));
}

export default function CustomerPage() {
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

  const [secretHex, setSecretHex] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [expiresInfo, setExpiresInfo] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cardCount, setCardCount] = useState(0);

  const [stats, setStats] = useState({
    totalStamps: 0,
    completedCards: 0,
    inProgressCards: 0,
    voucherCount: 0,
  });

  const program = useCustomerProgram(keypair);

  async function handleSignUp() {
    setAuthError(null);
    setKeypair(null);
    setNewMnemonic(null);
    try {
      const { keypair: kp, mnemonic } = await signUp(username, password);
      setKeypair(kp);
      setNewMnemonic(mnemonic);

      fetch("/api/customer-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: kp.publicKey.toBase58(), name: username }),
      }).catch((err) => console.error("Could not save display name:", err));
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
    setRefreshKey(0);
    setCardCount(0);
  }

  const RELAYER_PUBLIC_KEY = new PublicKey("5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e");

  // Runs automatically whenever the code field changes — whether typed,
  // pasted, or filled in by the QR scanner — with a short debounce so
  // rapid typing or a scan doesn't fire a burst of RPC reads at once.
  useEffect(() => {
    if (!program || !secretHex.includes(":")) {
      setExpiresInfo(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const [businessOwnerStr, secretOnly] = secretHex.split(":");
        if (!businessOwnerStr || !secretOnly) {
          setExpiresInfo(null);
          return;
        }

        const businessPubkey = new PublicKey(businessOwnerStr);
        const [businessPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("business"), businessPubkey.toBuffer()],
          program.programId
        );

        const secretBytes = new Uint8Array(
          secretOnly.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        );

        const keccak = await import("js-sha3");
        const secretHashBytes = keccak.keccak256.array(secretBytes);

        const [receiptPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("receipt"), businessPda.toBuffer(), Buffer.from(secretHashBytes)],
          program.programId
        );

        const [receiptAccount, onChainNow] = await Promise.all([
          program.account.receipt.fetch(receiptPda),
          getOnChainNow(program.provider.connection),
        ]);

        const expiresAt = Number((receiptAccount.expiresAt as any).toString());
        const secondsLeft = expiresAt - onChainNow;

        if (secondsLeft <= 0) {
          setExpiresInfo(null);
        } else if (secondsLeft < 3600) {
          setExpiresInfo(`This code works for about ${Math.ceil(secondsLeft / 60)} more minutes.`);
        } else {
          setExpiresInfo(`This code works for about ${Math.ceil(secondsLeft / 3600)} more hours.`);
        }
      } catch {
        setExpiresInfo(null);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [secretHex, program]);

  async function handleClaim() {
    if (!program || !keypair) return;
    setClaimError(null);

    try {
      const [businessOwnerStr, secretOnly] = secretHex.split(":");
      if (!businessOwnerStr || !secretOnly) {
        throw new Error("This code doesn't look right — make sure you scanned or pasted the whole thing.");
      }

      const businessPubkey = new PublicKey(businessOwnerStr);
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), businessPubkey.toBuffer()],
        program.programId
      );

      const secretBytes = new Uint8Array(
        secretOnly.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );

      const keccak = await import("js-sha3");
      const secretHashBytes = keccak.keccak256.array(secretBytes);

      const [receiptPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("receipt"), businessPda.toBuffer(), Buffer.from(secretHashBytes)],
        program.programId
      );

      const [cardPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("card"), businessPda.toBuffer(), keypair.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .claimReceipt(Array.from(secretBytes))
        .accounts({
          business: businessPda,
          receipt: receiptPda,
          card: cardPda,
          customer: keypair.publicKey,
          relayer: RELAYER_PUBLIC_KEY,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      tx.feePayer = RELAYER_PUBLIC_KEY;
      const { blockhash } = await program.provider.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.partialSign(keypair);

      const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");

      const res = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: serialized }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSecretHex("");
      setExpiresInfo(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setClaimError(translateError(err));
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen gap-6 p-8 bg-paper text-charcoal">
      {!keypair && (
        <div className="flex flex-col items-center gap-2 w-full max-w-sm mt-16">
          <p className="font-mono text-lg text-ink mb-2">Loyalty</p>
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

      {keypair && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          <div className="border border-line rounded-lg p-3 bg-white/60">
            <p className="text-xs text-charcoal/60 mb-1">Total stamps</p>
            <p className="font-mono font-semibold text-2xl text-ink">{stats.totalStamps}</p>
          </div>
          <div className="border border-line rounded-lg p-3 bg-white/60">
            <p className="text-xs text-charcoal/60 mb-1">Vouchers held</p>
            <p className="font-mono font-semibold text-2xl text-ink">{stats.voucherCount}</p>
          </div>
          <div className="border border-line rounded-lg p-3 bg-white/60">
            <p className="text-xs text-charcoal/60 mb-1">Cards completed</p>
            <p className="font-mono font-semibold text-2xl text-ink">{stats.completedCards}</p>
          </div>
          <div className="border border-line rounded-lg p-3 bg-white/60">
            <p className="text-xs text-charcoal/60 mb-1">In progress</p>
            <p className="font-mono font-semibold text-2xl text-ink">{stats.inProgressCards}</p>
          </div>
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

      {keypair && (
        <div className="flex flex-col items-center gap-2 border-t border-line pt-4 w-full max-w-sm">
          <button
            type="button"
            className="w-full bg-ink text-paper rounded-md py-3 text-sm font-medium flex items-center justify-center gap-2"
            onClick={() => setShowScanner((s) => !s)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" />
            </svg>
            {showScanner ? "Hide scanner" : "Scan to claim"}
          </button>

          {showScanner && (
            <QrScanner
              onScan={(text) => {
                setSecretHex(text);
                setShowScanner(false);
              }}
            />
          )}

          <input
            placeholder="Code (scan or paste from merchant screen)"
            value={secretHex}
            onChange={(e) => setSecretHex(e.target.value)}
            className="w-full border border-line rounded-md px-3 py-2 bg-white/60 font-mono text-sm"
          />
          {expiresInfo && <p className="text-charcoal/60 text-sm">{expiresInfo}</p>}
          <button
            className="w-full bg-stamp-red text-paper rounded-md py-2 text-sm font-medium"
            onClick={handleClaim}
          >
            Claim stamp
          </button>
          {claimError && <p className="text-stamp-red text-sm">{claimError}</p>}
        </div>
      )}

      {keypair && (
        <div className="flex flex-col items-center gap-6 border-t border-line pt-4 w-full">
          <MyCards
            keypair={keypair}
            refreshKey={refreshKey}
            onChange={() => setRefreshKey((k) => k + 1)}
            onLoaded={setCardCount}
            onStats={(s) => setStats((prev) => ({ ...prev, ...s }))}
          />
          <MyVouchers
            keypair={keypair}
            refreshKey={refreshKey}
            onChange={() => setRefreshKey((k) => k + 1)}
            onCount={(count) => setStats((prev) => ({ ...prev, voucherCount: count }))}
          />
          {cardCount > 0 && <BusinessDirectory keypair={keypair} />}
        </div>
      )}
    </div>
  );
}