"use client";

import { useState } from "react";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { keccak256 } from "js-sha3";
import { signUp, signIn } from "@/lib/customerAuth";
import { useCustomerProgram } from "@/lib/customerProgram";
import { MyCards } from "@/components/MyCards";
import { MyVouchers } from "@/components/MyVouchers";
import { BusinessDirectory } from "@/components/BusinessDirectory";

export default function CustomerPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [businessOwner, setBusinessOwner] = useState("");
  const [secretHex, setSecretHex] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const program = useCustomerProgram(keypair);

  async function handleSignUp() {
    setAuthError(null);
    setKeypair(null);
    try {
      setKeypair(await signUp(username, password));
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleSignIn() {
    setAuthError(null);
    setKeypair(null);
    try {
      setKeypair(await signIn(username, password));
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleClaim() {
    if (!program || !keypair) return;
    setClaimError(null);

    try {
      const businessPubkey = new PublicKey(businessOwner);
      const [businessPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("business"), businessPubkey.toBuffer()],
        program.programId
      );

      const secretBytes = new Uint8Array(
        secretHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
      const secretHashBytes = keccak256.array(secretBytes);

      const [receiptPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("receipt"), businessPda.toBuffer(), Buffer.from(secretHashBytes)],
        program.programId
      );

      const [cardPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("card"), businessPda.toBuffer(), keypair.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .claimReceipt(Array.from(secretBytes))
        .accounts({
          business: businessPda,
          receipt: receiptPda,
          card: cardPda,
          customer: keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setSecretHex("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <div className="flex flex-col items-center gap-2">
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={handleSignUp}>Sign up</button>
          <button onClick={handleSignIn}>Sign in</button>
        </div>
        {authError && <p className="text-red-600 text-sm">{authError}</p>}
        {keypair && <p className="text-sm">Logged in. Address: {keypair.publicKey.toBase58()}</p>}
      </div>

      {keypair && (
        <div className="flex flex-col items-center gap-2 border-t pt-4 w-full max-w-sm">
          <input
            placeholder="Business owner's wallet address"
            value={businessOwner}
            onChange={(e) => setBusinessOwner(e.target.value)}
            className="w-full"
          />
          <input
            placeholder="Secret code (paste from merchant screen)"
            value={secretHex}
            onChange={(e) => setSecretHex(e.target.value)}
            className="w-full"
          />
          <button onClick={handleClaim}>Claim stamp</button>
          {claimError && <p className="text-red-600 text-sm">{claimError}</p>}
        </div>
      )}

      {keypair && (
        <div className="flex flex-col items-center gap-6 border-t pt-4 w-full">
          <MyCards keypair={keypair} refreshKey={refreshKey} onChange={() => setRefreshKey((k) => k + 1)} />
                    <MyVouchers keypair={keypair} refreshKey={refreshKey} onChange={() => setRefreshKey((k) => k + 1)} />
                                <BusinessDirectory keypair={keypair} />
        </div>
      )}
    </div>
  );
}