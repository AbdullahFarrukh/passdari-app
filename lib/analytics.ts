import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@anchor-lang/core";
import idl from "./loyalty.json";

const PROGRAM_ID = new PublicKey("HWvvvwSEounpNXcbD4JUNmniB5YxTcFNYoAestzJJCuL");
const connection = new Connection("http://127.0.0.1:8899");
const coder = new BorshCoder(idl as any);

export async function getBusinessAnalytics(ownerAddress: string) {
  const ownerPubkey = new PublicKey(ownerAddress);
  const [businessPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("business"), ownerPubkey.toBuffer()],
    PROGRAM_ID
  );

  const businessInfo = await connection.getAccountInfo(businessPda);
  if (!businessInfo) throw new Error("Business not found");
  const business: any = coder.accounts.decode("Business", businessInfo.data);
  const stampsRequired = business.stampsRequired as number;

  const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 1000 });
  const claims: { customer: string; timestamp: number }[] = [];

  for (const sig of signatures) {
    const tx = await connection.getTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta?.logMessages) continue;

    for (const log of tx.meta.logMessages) {
      if (!log.startsWith("Program data: ")) continue;
      try {
        const decoded: any = coder.events.decode(log.slice("Program data: ".length));
        if (!decoded || decoded.name !== "StampClaimed") continue;
        if (decoded.data.business.toBase58() !== businessPda.toBase58()) continue;

        claims.push({
          customer: decoded.data.customer.toBase58(),
          timestamp: Number(decoded.data.timestamp.toString()),
        });
      } catch {
        // Not a StampClaimed event — skip.
      }
    }
  }

  const stampsPerDay: Record<string, number> = {};
  for (const c of claims) {
    const day = new Date(c.timestamp * 1000).toISOString().slice(0, 10);
    stampsPerDay[day] = (stampsPerDay[day] ?? 0) + 1;
  }

  const hourDistribution: Record<number, number> = {};
  for (const c of claims) {
    const hour = new Date(c.timestamp * 1000).getUTCHours();
    hourDistribution[hour] = (hourDistribution[hour] ?? 0) + 1;
  }

  const claimsPerWallet: Record<string, number> = {};
  for (const c of claims) {
    claimsPerWallet[c.customer] = (claimsPerWallet[c.customer] ?? 0) + 1;
  }
  const uniqueCustomers = Object.keys(claimsPerWallet).length;
  const repeatCustomers = Object.values(claimsPerWallet).filter((n) => n > 1).length;
  const repeatVisitRate = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;

  const cardAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: 8, bytes: businessPda.toBase58() } }],
  });

  let oneStampAway = 0;
  for (const { account } of cardAccounts) {
    try {
      const card: any = coder.accounts.decode("LoyaltyCard", account.data);
      if (card.stamps === stampsRequired - 1) oneStampAway++;
    } catch {
      // Not a LoyaltyCard account — skip.
    }
  }

  return {
    businessName: business.name as string,
    totalClaims: claims.length,
    uniqueCustomers,
    repeatVisitRate: Math.round(repeatVisitRate * 100) / 100,
    stampsPerDay,
    hourDistribution,
    claimsPerWallet,
    customersOneStampAway: oneStampAway,
  };
}