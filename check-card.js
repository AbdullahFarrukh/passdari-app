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

  console.log("Card address:", cardPda.toBase58());

  const account = await connection.getAccountInfo(cardPda);
  if (!account) {
    console.log("No card account found at this address.");
    return;
  }

  const stamps = account.data.readUInt8(72);
  const stampsRequiredSnapshot = account.data.readUInt8(101);
  console.log("Real on-chain stamps:", stamps);
  console.log("Real on-chain stamps_required_snapshot:", stampsRequiredSnapshot);
}

main();