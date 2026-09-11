const { PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey("HWvvvwSEounpNXcbD4JUNmniB5YxTcFNYoAestzJJCuL");
const merchantWallet = new PublicKey(process.argv[2]);
const customerWallet = new PublicKey(process.argv[3]);

const [businessPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("business"), merchantWallet.toBuffer()],
  PROGRAM_ID
);

const [cardPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("card"), businessPda.toBuffer(), customerWallet.toBuffer()],
  PROGRAM_ID
);

const [voucherPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("voucher"), businessPda.toBuffer(), Buffer.from(new Array(8).fill(0))],
  PROGRAM_ID
);

console.log("Expected merchant wallet:", merchantWallet.toBase58());
console.log("Expected card address:", cardPda.toBase58());
console.log("Expected voucher #0 address:", voucherPda.toBase58());