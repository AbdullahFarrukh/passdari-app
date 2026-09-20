"use client";

import { useState, useEffect } from "react";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { signUp, signIn, recoverAccount } from "@/lib/customerAuth";
import { useCustomerProgram } from "@/lib/customerProgram";
import { translateError } from "@/lib/errorMessages";
import { saveDisplayName } from "@/lib/displayName";
import { MyCards } from "@/components/MyCards";
import { MyVouchers } from "@/components/MyVouchers";
import { BusinessDirectory } from "@/components/BusinessDirectory";
import { ClaimPanel } from "@/components/ClaimPanel";
import { StatStrip } from "@/components/ui/StatStrip";
import { AuthPanel } from "@/components/AuthPanel";
import { AccountBar } from "@/components/AccountBar";
import { MnemonicNotice } from "@/components/MnemonicNotice";

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

      // Signed with the new wallet's own key, so only its owner can set its name.
      saveDisplayName(kp, username);
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
      // Customers who signed up before names could be saved get one now. This
      // only fills in a missing name, it never replaces one that is there.
      saveDisplayName(kp, username, { onlyIfMissing: true });
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
      saveDisplayName(kp, recoveryUsername, { onlyIfMissing: true });
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
        } as any)
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
    <div className="flex flex-col items-center gap-6 px-4 py-8 text-charcoal">
      {!keypair && (
        <AuthPanel
          role="customer"
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

      {keypair && <h1 className="sr-only">Your stamp cards and vouchers</h1>}

      {keypair && (
        <AccountBar username={username} address={keypair.publicKey.toBase58()} onSignOut={handleSignOut} />
      )}

      {newMnemonic && <MnemonicNotice phrase={newMnemonic} onDismiss={() => setNewMnemonic(null)} />}

      {keypair && (
        <div className="grid w-full max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
          <div className="lg:col-span-2">
            <StatStrip
              items={[
                { label: "Total stamps", value: stats.totalStamps },
                { label: "Vouchers held", value: stats.voucherCount },
                { label: "Cards completed", value: stats.completedCards },
                { label: "In progress", value: stats.inProgressCards },
              ]}
            />
          </div>

          <div className="lg:col-start-1 lg:row-start-1">
            <ClaimPanel
              code={secretHex}
              onCode={setSecretHex}
              expiresInfo={expiresInfo}
              onClaim={handleClaim}
              error={claimError}
              showScanner={showScanner}
              onToggleScanner={() => setShowScanner((s) => !s)}
              onScan={(text) => {
                setSecretHex(text);
                setShowScanner(false);
              }}
            />
          </div>

          {/* On a phone the customer's own cards and vouchers come before the list of businesses. */}
          <div className="flex flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
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
          </div>

          {cardCount > 0 && (
            <div className="lg:col-start-1 lg:row-start-2">
              <BusinessDirectory keypair={keypair} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}