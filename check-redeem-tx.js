const { Connection, PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey("HWvvvwSEounpNXcbD4JUNmniB5YxTcFNYoAestzJJCuL");
const connection = new Connection("http://127.0.0.1:8899");

async function main() {
  const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 5 });

  for (const sig of signatures) {
    const tx = await connection.getTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta?.logMessages) continue;

    const isRedeem = tx.meta.logMessages.some((l) => l.includes("RedeemVoucher"));
    if (!isRedeem) continue;

    console.log("=== Found a RedeemVoucher transaction ===");
    console.log("Signature:", sig.signature);
    console.log("Logs:", tx.meta.logMessages);
    console.log(
      "All account keys involved:",
      tx.transaction.message.staticAccountKeys.map((k) => k.toBase58())
    );
    return;
  }

  console.log("No RedeemVoucher transaction found in the last 5.");
}

main();