// Grows every stamp card already on chain to the current shape, and hands back the rent of the old
// per-NFT records at the same time.
//
// MUST BE RUN IMMEDIATELY AFTER THE PROGRAM UPGRADE. An old card is 32 bytes shorter than the current
// struct, so until it has been through here the program cannot read it at all — the app will show those
// customers nothing. The window should be minutes, not hours.
//
// Whoever migrates a card becomes its recorded rent payer when no old record survives to say otherwise,
// so this must be run with the real relayer key and nobody else's.
//
//   node scripts/migrate-cards.cjs [--dry-run]
const fs = require("fs");
const path = require("path");
const { Connection, Keypair, PublicKey, SystemProgram, Transaction } = require("@solana/web3.js");
const { Program, AnchorProvider } = require("@anchor-lang/core");

const APP_DIR = path.resolve(__dirname, "..");
const idl = JSON.parse(fs.readFileSync(path.join(APP_DIR, "lib/loyalty.json"), "utf8"));
const env = Object.fromEntries(
  fs.readFileSync(path.join(APP_DIR, ".env.local"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const DRY = process.argv.includes("--dry-run");
const connection = new Connection(env.HELIUS_RPC_URL, "confirmed");
const relayer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env.RELAYER_SECRET_KEY)));
const program = new Program(idl, new AnchorProvider(
  connection,
  { publicKey: relayer.publicKey, signTransaction: async (t) => t, signAllTransactions: async (t) => t },
  { commitment: "confirmed" }
));
const PROGRAM_ID = program.programId;
const OLD_CARD_LEN = 103;
const CARD_DISCRIMINATOR = Buffer.from(
  idl.accounts.find((a) => a.name === "LoyaltyCard").discriminator
);

const pda = (seeds) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
const u32le = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };

async function withRetries(what, attempt) {
  let last;
  for (let i = 1; i <= 4; i++) {
    try { return await attempt(); }
    catch (err) {
      const m = err?.message ?? String(err);
      if (/custom program error|Error Code:|AlreadyMigrated|NotACard/i.test(m)) throw err;
      last = err;
      if (i < 4) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw new Error(`${what} failed: ${last?.message ?? last}`);
}

(async () => {
  const before = await connection.getBalance(relayer.publicKey);
  console.log(`relayer ${relayer.publicKey.toBase58()} starts with ${(before / 1e9).toFixed(5)} SOL`);

  // Read the raw accounts: an old card cannot be decoded by the new IDL, which is the whole point.
  // Filter by size — 103 bytes belongs to no other account type this program makes — then confirm the
  // discriminator in case that ever stops being true.
  const old = (await connection.getProgramAccounts(PROGRAM_ID, { filters: [{ dataSize: OLD_CARD_LEN }] }))
    .filter((a) => a.account.data.subarray(0, 8).equals(CARD_DISCRIMINATOR));
  const current = (await program.account.loyaltyCard.all()).length;
  console.log(`${current} cards already on the current shape, ${old.length} still on the old one\n`);
  if (old.length === 0) return console.log("Nothing to migrate.");
  if (DRY) return console.log("Dry run: stopping before sending anything.");

  let done = 0, recordsClosed = 0, failed = 0;
  for (const { pubkey, account } of old) {
    // Everything needed is at a fixed offset in the old layout.
    const cycle = account.data.readUInt32LE(97);
    const mint = pda([Buffer.from("card_mint"), pubkey.toBuffer(), u32le(cycle)]);
    const record = pda([Buffer.from("card_nft"), mint.toBuffer()]);

    // If an old record is still there it names the true payer, and only that wallet may receive its
    // rent back, so pass exactly what it says.
    const recordInfo = await connection.getAccountInfo(record);
    let rentPayer = relayer.publicKey;
    if (recordInfo && recordInfo.data.length > 0) {
      rentPayer = new PublicKey(recordInfo.data.subarray(8, 40));
      recordsClosed += 1;
    }

    try {
      const ix = await program.methods.migrateCard()
        .accounts({
          card: pubkey, record, cardMint: mint, rentPayer,
          relayer: relayer.publicKey, systemProgram: SystemProgram.programId,
        })
        .instruction();
      await withRetries(`migrating ${pubkey.toBase58().slice(0, 8)}`, async () => {
        const tx = new Transaction().add(ix);
        tx.feePayer = relayer.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.sign(relayer);
        const sig = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 5 });
        await connection.confirmTransaction(sig, "confirmed");
      });
      done += 1;
      if (done % 20 === 0) console.log(`  ${done}/${old.length}`);
    } catch (err) {
      failed += 1;
      console.error(`  ! ${pubkey.toBase58()}: ${(err.message ?? err).split("\n")[0]}`);
    }
  }

  const after = await connection.getBalance(relayer.publicKey);
  const movement = after - before;
  console.log(`\nmigrated ${done}, closed ${recordsClosed} old records, ${failed} failed`);
  console.log(`relayer balance moved by ${(movement / 1e9).toFixed(6)} SOL`);
  console.log(movement >= 0
    ? "  (positive: the old records handed back more than the extra card bytes cost)"
    : "  (negative: the extra card bytes cost more than the records handed back)");

  const left = (await connection.getProgramAccounts(PROGRAM_ID, { filters: [{ dataSize: OLD_CARD_LEN }] }))
    .filter((a) => a.account.data.subarray(0, 8).equals(CARD_DISCRIMINATOR)).length;
  console.log(left === 0 ? "Every card is on the current shape." : `STILL OLD: ${left} cards — re-run.`);
})().catch((e) => { console.error("FAILED:", e.message ?? e); process.exit(1); });
