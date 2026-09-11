const { Connection, PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey("HWvvvwSEounpNXcbD4JUNmniB5YxTcFNYoAestzJJCuL");
const merchantWallet = new PublicKey(process.argv[2]);
const customerWallet = new PublicKey(process.argv[3]);

async function main() {
  const connection = new Connection("http://127.0.0.1:8899");

  const [businessPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("business"), merchantWallet.toBuffer()],
    PROGRAM_ID
  );

  const [cardPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("card"), businessPda.toBuffer(), customerWallet.toBuffer()],
    PROGRAM_ID
  );

  const account = await connection.getAccountInfo(cardPda);
  if (!account) {
    console.log("No card account found at this address.");
    return;
  }

  const redemptions = account.data.readUInt32LE(97);
  console.log("Real on-chain redemptions:", redemptions);
}

main();