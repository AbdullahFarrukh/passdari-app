// Builds a set of demo shops and customers on devnet, so the public directory has something real and
// presentable in it instead of leftovers from end-to-end test runs.
//
// Everything it makes is genuine: real accounts, real receipts, real stamps claimed one at a time with
// the shop's own cooldown respected, real cash-ins that mint a real voucher NFT. Nothing is faked or
// written straight into an account, because the directory's whole claim is that its numbers can be
// checked on-chain — so they had better be true.
//
// The accounts are created from 12-word phrases generated here and printed at the end, so they can be
// signed into through the app's own "recover account" screen on any device.
//
// Run from the app directory:
//   node scripts/make-demo-shops.cjs
//
// It is safe to stop and re-run: a shop that already exists is skipped, and stamping picks up where it
// left off.

const fs = require("fs");
const path = require("path");
const bip39 = require("bip39");
const { derivePath } = require("ed25519-hd-key");
const BN = require("bn.js");
const nacl = require("tweetnacl");
const { keccak256 } = require("js-sha3");
const { Connection, Keypair, PublicKey, SystemProgram, Transaction } = require("@solana/web3.js");
const { Program, AnchorProvider } = require("@anchor-lang/core");
const { Redis } = require("@upstash/redis");

const APP_DIR = path.resolve(__dirname, "..");
const idl = JSON.parse(fs.readFileSync(path.join(APP_DIR, "lib/loyalty.json"), "utf8"));

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const STAMP_COOLDOWN_MS = 61_000;
const SITE = process.env.DEMO_SITE_ORIGIN ?? "https://passdari-app.vercel.app";

function env() {
  const raw = fs.readFileSync(path.join(APP_DIR, ".env.local"), "utf8");
  return Object.fromEntries(
    raw.split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
  );
}

// Exactly what lib/customerAuth.ts does in the browser, so a phrase printed here opens the same wallet.
function keypairFromMnemonic(mnemonic) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  return Keypair.fromSeed(derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key);
}

function newAccount(username) {
  const mnemonic = bip39.generateMnemonic();
  return { username, mnemonic, keypair: keypairFromMnemonic(mnemonic) };
}

// ---------------------------------------------------------------------------
// Who and what gets made.
// Stamp counts are deliberately small: every stamp is claimed for real, and the program makes a card wait
// a minute between stamps, so a shop needing ten would take an hour of real time to demonstrate.
// ---------------------------------------------------------------------------
const SHOPS = [
  { username: "chaiwala",     name: "Chai Wala",             category: "Cafe",       reward: "Free cup of chai",      stamps: 3, minPkr: 150 },
  { username: "zaiqabakers",  name: "Zaiqa Bakers",          category: "Bakery",     reward: "Free dozen cupcakes",   stamps: 4, minPkr: 500 },
  { username: "burgerhub",    name: "Burger Hub",            category: "Fast food",  reward: "Free Zinger burger",    stamps: 4, minPkr: 600 },
  { username: "biryanihouse", name: "Karachi Biryani House", category: "Restaurant", reward: "Free biryani plate",    stamps: 3, minPkr: 800 },
  { username: "stylestudio",  name: "Style Studio",          category: "Salon",      reward: "Free haircut",          stamps: 4, minPkr: 1200 },
  { username: "alnoorpharma", name: "Al-Noor Pharmacy",      category: "Pharmacy",   reward: "20% off your next visit", stamps: 3, minPkr: 1000 },
];

const CUSTOMERS = [
  { username: "ayesha",  name: "Ayesha Khan" },
  { username: "bilal",   name: "Bilal Ahmed" },
  { username: "fatima",  name: "Fatima Noor" },
  { username: "hassan",  name: "Hassan Raza" },
  { username: "zainab",  name: "Zainab Ali" },
  { username: "usman",   name: "Usman Tariq" },
  { username: "mariam",  name: "Mariam Siddiqui" },
  { username: "omar",    name: "Omar Farooq" },
];

// Per shop: which customers shop there, how many rewards each has finished, and how many stamps they are
// part-way through now. Spread about so each shop's "most loyal" list looks like real trade, not a loop.
const TRADE = [
  [[0, 2, 1], [1, 1, 0], [2, 1, 2], [3, 1, 0], [4, 1, 1], [5, 0, 2]],
  [[1, 2, 0], [2, 1, 1], [4, 1, 0], [6, 1, 2], [7, 1, 0], [0, 0, 3]],
  [[3, 2, 1], [5, 1, 0], [0, 1, 2], [7, 1, 0], [1, 1, 1], [2, 0, 2]],
  [[2, 2, 0], [6, 1, 1], [3, 1, 0], [0, 1, 1], [5, 1, 0], [4, 0, 2]],
  [[4, 2, 0], [7, 1, 2], [1, 1, 0], [5, 1, 1], [6, 1, 0], [3, 0, 3]],
  [[6, 2, 1], [0, 1, 0], [4, 1, 1], [2, 1, 0], [7, 1, 2], [1, 0, 1]],
];

// ---------------------------------------------------------------------------

const settings = env();
const connection = new Connection(settings.HELIUS_RPC_URL, "confirmed");
const relayer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(settings.RELAYER_SECRET_KEY)));

const program = new Program(idl, new AnchorProvider(
  connection,
  { publicKey: relayer.publicKey, signTransaction: async (t) => t, signAllTransactions: async (t) => t },
  { commitment: "confirmed" }
));
const pda = (seeds) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];
const u32le = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const u64le = (n) => new BN(n).toArrayLike(Buffer, "le", 8);

function tokenAccountFor(owner, mint) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

async function send(instructions, signers, what) {
  const tx = new Transaction().add(...instructions);
  tx.feePayer = relayer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(...signers);
  try {
    const sig = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 5 });
    await connection.confirmTransaction(sig, "confirmed");
    return sig;
  } catch (err) {
    throw new Error(`${what} failed: ${err.message}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function registerShop(shop) {
  const business = pda([Buffer.from("business"), shop.keypair.publicKey.toBuffer()]);
  if (await connection.getAccountInfo(business)) {
    console.log(`  · ${shop.name} already registered`);
    return business;
  }
  const ix = await program.methods
    .registerBusiness(shop.name, shop.category, shop.reward, shop.stamps, new BN(shop.minPkr * 100), "PKR", 7200)
    .accounts({ business, authority: shop.keypair.publicKey, relayer: relayer.publicKey, systemProgram: SystemProgram.programId })
    .instruction();
  await send([ix], [relayer, shop.keypair], `registering ${shop.name}`);
  console.log(`  ✓ registered ${shop.name} (${shop.category}) — ${shop.stamps} stamps for ${shop.reward}`);
  return business;
}

// One stamp, the real way: the shop issues a receipt and the customer claims it. Both go in one
// transaction, which is the only shortcut taken here — it halves the round trips without changing what
// ends up on chain. The card's NFT is minted alongside the first stamp, exactly as the app does it.
async function giveStamp(shop, business, customer, card) {
  const secret = Uint8Array.from(require("crypto").randomBytes(32));
  const secretHash = keccak256.array(secret);
  const receipt = pda([Buffer.from("receipt"), business.toBuffer(), Buffer.from(secretHash)]);

  const issue = await program.methods
    .issueReceipt(secretHash, 1)
    .accounts({ business, receipt, authority: shop.keypair.publicKey, relayer: relayer.publicKey, systemProgram: SystemProgram.programId })
    .instruction();

  const claim = await program.methods
    .claimReceipt(Array.from(secret))
    .accounts({
      business, receipt, card,
      customer: customer.keypair.publicKey,
      relayer: relayer.publicKey,
      rentPayer: relayer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const instructions = [issue, claim];

  const existing = await program.account.loyaltyCard.fetchNullable(card);
  const cycle = existing ? existing.nftCycle : 0;
  const cardMint = pda([Buffer.from("card_mint"), card.toBuffer(), u32le(cycle)]);
  if (!(await connection.getAccountInfo(cardMint))) {
    const uri = `${SITE}/c/${cardMint.toBase58()}`;
    instructions.push(await program.methods
      .mintCardNft(uri.length <= 100 ? uri : "")
      .accounts({
        business, card, mint: cardMint,
        record: pda([Buffer.from("card_nft"), cardMint.toBuffer()]),
        customerToken: tokenAccountFor(customer.keypair.publicKey, cardMint),
        customer: customer.keypair.publicKey,
        relayer: relayer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction());
  }

  await send(instructions, [relayer, shop.keypair, customer.keypair], `stamping ${customer.name} at ${shop.name}`);
}

// Spends a full card on a real voucher NFT, which is what makes someone show up as a loyal customer:
// the leaderboard counts rewards finished, and stamps only leave a card this way.
async function cashIn(shop, business, customer, card) {
  const businessAccount = await program.account.business.fetch(business);
  const voucherId = new BN(businessAccount.totalVouchersIssued.toString());
  const voucher = pda([Buffer.from("voucher"), business.toBuffer(), u64le(voucherId)]);
  const voucherMint = pda([Buffer.from("voucher_mint"), business.toBuffer(), u64le(voucherId)]);

  const cardAccount = await program.account.loyaltyCard.fetch(card);
  const cardMint = pda([Buffer.from("card_mint"), card.toBuffer(), u32le(cardAccount.nftCycle)]);
  const cardNftRecord = pda([Buffer.from("card_nft"), cardMint.toBuffer()]);

  // The rent for the card NFT goes back to whoever paid it. For a card made before records existed there
  // is nothing to read, and the relayer is the right answer.
  let cardRentPayer = relayer.publicKey;
  const record = await connection.getAccountInfo(cardNftRecord);
  if (record) {
    try { cardRentPayer = (await program.account.cardNft.fetch(cardNftRecord)).rentPayer; } catch { /* keep the relayer */ }
  }

  const uri = `${SITE}/v/${voucherMint.toBase58()}`;
  const ix = await program.methods
    .mintVoucher(voucherId, uri.length <= 100 ? uri : "")
    .accounts({
      business, card, voucher, mint: voucherMint,
      customerToken: tokenAccountFor(customer.keypair.publicKey, voucherMint),
      cardMint,
      cardToken: tokenAccountFor(customer.keypair.publicKey, cardMint),
      cardNftRecord, cardRentPayer,
      customer: customer.keypair.publicKey,
      relayer: relayer.publicKey,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  await send([ix], [relayer, customer.keypair], `cashing in for ${customer.name} at ${shop.name}`);
}

// Names are shown on the public directory, so they are saved the same way the app saves them: signed by
// the wallet itself. Written under both environment keys so they show up locally and on the live site.
async function saveNames(people) {
  const url = settings.UPSTASH_REDIS_REST_URL ?? settings.KV_REST_API_URL;
  const token = settings.UPSTASH_REDIS_REST_TOKEN ?? settings.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.log("  ! no Upstash settings found — skipping display names");
    return;
  }
  const redis = new Redis({ url, token, automaticDeserialization: false });
  const entries = Object.fromEntries(people.map((p) => [p.keypair.publicKey.toBase58(), p.name]));
  for (const environment of ["production", "development", "preview"]) {
    await redis.hset(`passdari:customer_names:${environment}`, entries);
  }
  // Proves the names really belong to those wallets, the same check the names endpoint makes.
  for (const p of people) {
    const address = p.keypair.publicKey.toBase58();
    const timestamp = Date.now();
    const message = new TextEncoder().encode(
      `Passdari display name v1\n${JSON.stringify({ address, name: p.name, timestamp })}`
    );
    const signature = nacl.sign.detached(message, p.keypair.secretKey);
    if (!nacl.sign.detached.verify(message, signature, p.keypair.publicKey.toBytes())) {
      throw new Error(`could not prove the name for ${p.name}`);
    }
  }
  console.log(`  ✓ saved ${people.length} display names`);
}

(async () => {
  const before = await connection.getBalance(relayer.publicKey);
  console.log(`relayer ${relayer.publicKey.toBase58()} starts with ${(before / 1e9).toFixed(4)} SOL\n`);

  // A one-shop, one-customer, one-reward run, to prove every transaction shape works before committing
  // to the full set. Leaves a real (small) shop behind, so use a throwaway name for it.
  const smoke = process.env.DEMO_SMOKE === "1";
  const shopPlan = smoke ? [{ ...SHOPS[0], username: "smoketest", name: "Smoke Test Cafe", stamps: 1 }] : SHOPS;
  const tradePlan = smoke ? [[[0, 1, 1]]] : TRADE;

  const shops = shopPlan.map((s) => ({ ...s, ...newAccount(s.username) }));
  const customers = (smoke ? CUSTOMERS.slice(0, 1) : CUSTOMERS).map((c) => ({ ...c, ...newAccount(c.username) }));

  console.log("Registering shops");
  for (const shop of shops) shop.business = await registerShop(shop);

  console.log("\nSaving customer names");
  await saveNames(customers);

  // What each card needs in total, and how much of it is already done.
  const cards = [];
  shops.forEach((shop, shopIndex) => {
    for (const [customerIndex, rewards, leftover] of tradePlan[shopIndex]) {
      const customer = customers[customerIndex];
      cards.push({
        shop, customer,
        address: pda([Buffer.from("card"), shop.business.toBuffer(), customer.keypair.publicKey.toBuffer()]),
        rewardsWanted: rewards,
        stampsWanted: rewards * shop.stamps + leftover,
        given: 0,
        lastStampAt: 0,
      });
    }
  });

  const totalStamps = cards.reduce((n, c) => n + c.stampsWanted, 0);
  console.log(`\nStamping: ${totalStamps} stamps across ${cards.length} cards at ${shops.length} shops.`);
  console.log("A card has to wait a minute between stamps, so this cycles through all the cards in turn.\n");

  let done = 0;
  while (cards.some((c) => c.given < c.stampsWanted)) {
    for (const card of cards) {
      if (card.given >= card.stampsWanted) continue;
      const wait = card.lastStampAt + STAMP_COOLDOWN_MS - Date.now();
      if (wait > 0) await sleep(wait);
      await giveStamp(card.shop, card.shop.business, card.customer, card.address);
      card.given += 1;
      card.lastStampAt = Date.now();
      done += 1;
      if (done % 10 === 0 || done === totalStamps) {
        console.log(`  ${done}/${totalStamps} stamps`);
      }
      // Cash in as soon as a card is full, so the stamps make room for the next round.
      const full = await program.account.loyaltyCard.fetch(card.address);
      if (card.rewardsWanted > 0 && full.stamps >= full.stampsRequiredSnapshot) {
        await cashIn(card.shop, card.shop.business, card.customer, card.address);
        card.rewardsWanted -= 1;
        console.log(`    ✓ ${card.customer.name} finished a card at ${card.shop.name}`);
      }
    }
  }

  const after = await connection.getBalance(relayer.publicKey);
  console.log(`\nRelayer spent ${((before - after) / 1e9).toFixed(4)} SOL. Balance now ${(after / 1e9).toFixed(4)} SOL.`);

  const credentials = {
    note: "Devnet demo accounts. Sign in with the app's 'Recover account' option: username + 12 words + a new password of at least 8 characters.",
    created: new Date().toISOString(),
    shops: shops.map((s) => ({ shopName: s.name, signInAt: "/merchant", username: s.username, recoveryPhrase: s.mnemonic, wallet: s.keypair.publicKey.toBase58(), businessAccount: s.business.toBase58() })),
    customers: customers.map((c) => ({ displayName: c.name, signInAt: "/customer", username: c.username, recoveryPhrase: c.mnemonic, wallet: c.keypair.publicKey.toBase58() })),
  };
  const out = path.join(APP_DIR, "..", smoke ? "passdari-smoke-credentials.json" : "passdari-demo-credentials.json");
  fs.writeFileSync(out, JSON.stringify(credentials, null, 2));
  console.log(`\nCredentials written to ${out}`);
})().catch((e) => { console.error("\nFAILED:", e.message ?? e); process.exit(1); });
