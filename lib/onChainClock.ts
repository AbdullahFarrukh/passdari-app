import { Connection, PublicKey } from "@solana/web3.js";

const CLOCK_SYSVAR = new PublicKey("SysvarC1ock11111111111111111111111111111111");

// The real on-chain time, read from the Clock sysvar rather than the local machine's clock — what the
// program checks a receipt's or voucher's expiry against. Shared by the housekeeping panel and the
// server-side cleanup job, so both agree with the program on what counts as expired.
export async function getOnChainNow(connection: Connection): Promise<number> {
  const accountInfo = await connection.getAccountInfo(CLOCK_SYSVAR);
  if (!accountInfo) throw new Error("Could not read the on-chain clock");
  // The Clock sysvar's unix_timestamp is an i64, little-endian, at byte offset 32.
  return Number(accountInfo.data.readBigInt64LE(32));
}
