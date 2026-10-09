# Passdari — Web App

The web frontend for the Passdari dApp — two interfaces in one app: a merchant
dashboard and a customer loyalty wallet, both talking to the on-chain program in
[`passdari`](https://github.com/AbdullahFarrukh/passdari). Neither side installs
a wallet extension, and neither side ever holds or spends SOL — a backend relayer
covers every fee and every account's rent, for both. It runs live on devnet at
[passdari-app.vercel.app](https://passdari-app.vercel.app).

---

## The two interfaces

**Neither merchants nor customers touch a wallet extension.** Both sign up with
just a username and password. Under the hood, the app generates a real Solana
keypair from a proper BIP-39 mnemonic phrase, encrypts it with their password,
and stores it in the browser. The 12-word phrase is shown once, at sign-up, with
a clear warning it can never be shown again — the only way to recover an account
afterward. The sign-in screens say all of this in plain words, because it is the
most interesting thing about the app and would otherwise be invisible.

**Merchants** — after signing in, the app checks whether a `Business` PDA exists
for that keypair; if not, a registration form; if so, straight to the dashboard.

**Customers** route straight to their own interface — no role check needed,
since only a merchant's own choice to register creates a `Business` at all.

## Everything on-chain is visible

Every card, voucher, receipt and business is an account on Solana, so the app
shows its real address wherever it appears, with a button to copy it and a link to
Solana Explorer (`components/ui/OnChainId.tsx`). A voucher is a Token-2022 NFT,
so its ticket also shows the NFT's mint and the token account that holds it. A
stamp card has its own NFT too (soulbound: it can't be sent to another wallet, and it
is burned when the card is cashed in), shown as a "Card NFT" line and address on the
card. The top bar shows which network the app runs on, and the footer shows the program's
address. The links point at devnet by default; set `NEXT_PUBLIC_SOLANA_CLUSTER`
to `localnet` or `mainnet-beta` to change them (`lib/explorer.ts`).

## Stack

- Next.js (App Router) + Tailwind v4
- A fee-payer relayer: the `/api/relay` route adds the relayer's signature. Its secret key comes from the `RELAYER_SECRET_KEY` environment variable and is never sent to the browser — see the program repo's "Who pays" section
- Anchor's TypeScript client (`@anchor-lang/core`)
- `@solana/web3.js` for everything Token-2022 (finding a wallet's tokens, working out token account addresses) — see `lib/vouchers.ts`
- `bip39` + `ed25519-hd-key` for both merchant and customer key generation, and `tweetnacl` for signing requests to the copilot and the names endpoint
- `react-zxing` for the camera QR scanner, with manual code entry as a mandatory fallback
- `@google/genai` (Gemini) for the AI copilot, with three fixed, clickable questions and a real, honest fallback (plain-templated real data, clearly labeled) if the live AI call fails
- Upstash Redis (`@upstash/redis`) for the customer display names and the shared rate-limit counters
- "Bill": a fluorescent-yellow counter, black ink and white receipt paper, with stamp blue and alert red as the only two accents — Big Shoulders for headings and buttons, Martian Mono for data and labels, Figtree for body text. Cards and tickets are printed as receipts (torn top and bottom edge, dotted-leader rows) via `components/ui/Receipt.tsx` and `ReceiptRow.tsx`; the design tokens are in `app/globals.css` and the rest of the shared pieces (buttons, address chips, stamp cards) are in `components/ui/`

## Running locally

```bash
npm install
```

Create `.env.local`:

| Variable | What it is | Needed? |
|---|---|---|
| `GEMINI_API_KEY` | For the AI copilot. Get a free key at [aistudio.google.com](https://aistudio.google.com) — no billing required for the free tier | Only for the copilot's live answers |
| `HELIUS_RPC_URL` | The Solana RPC address the server uses (relay and copilot data) | Recommended; falls back to the public devnet endpoint, which is slow and unreliable |
| `NEXT_PUBLIC_HELIUS_RPC_URL` | The same, for the browser | Same |
| `RELAYER_SECRET_KEY` | The relayer's secret key, as a JSON array of its 64 bytes (the contents of a `solana-keygen` file). Never commit it | Yes |
| `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or Vercel's `KV_REST_API_URL` and `KV_REST_API_TOKEN`) | The store for customer display names and the shared rate-limit counts | Optional. Without them names are kept in memory and disappear when the dev server restarts, and rate limits are only per instance. A production build refuses to save a name instead, with a clear error |
| `CRON_SECRET` | Guards the daily clean-up sweep (see below); Vercel sets this as the request's bearer token automatically once the variable exists | Recommended in production; without it the sweep refuses to run rather than run unguarded |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` (default), `localnet` or `mainnet-beta`, for the Explorer links | Optional |

**Point it at devnet** (what the live site does): set the two RPC addresses to a
devnet endpoint and fund the relayer with a few devnet SOL.

### What the relayer actually spends

Fees are the only thing it never gets back. Every transaction this app builds has
two signatures at 5,000 lamports each, because the relayer is always the fee payer
and a fee payer always signs:

| Action | Fee |
|---|---|
| Register a business | 0.00001 SOL |
| One stamp | 0.00002 SOL |
| One reward (mint, present, redeem) | 0.00003 SOL |
| Send stamps to a friend | 0.00001 SOL |
| Any clean-up | 0.000005 SOL |

Rent is a loan, not a cost. Measured on devnet: an active stamp card with its NFT
holds **0.00580 SOL**, and a live voucher **0.00613 SOL** more until it is redeemed.
Every account can now be closed and its rent returned — including stamp cards and
businesses, which until October 2026 were the two things that could never come back.
The app passes each account's recorded `rentPayer` when closing it; see
`lib/cleanup.ts` and "Housekeeping," below. The program repo's README has the full
per-account table and the mainnet multiplier.

**A rough bill.** 100 shops with 500 active customers each, visiting weekly, is
about **4.9 SOL a month in fees**, against roughly 310 SOL of rent held at any one
moment and returned as cards and vouchers close. At that size the working capital
matters far more than the running cost.

**Or run everything locally:** build the program in the program repo
(`anchor build`), start a validator with it loaded, and fund the relayer:

```bash
solana-test-validator --reset \
  --bpf-program HWvvvwSEounpNXcbD4JUNmniB5YxTcFNYoAestzJJCuL target/deploy/loyalty.so
solana airdrop 100 5Yb1XxssgZuPd4qZMSWADHBZZXdM1vZ6kJpuYgmrVR4e -u localhost
```

Then set both RPC addresses to `http://127.0.0.1:8899` and
`NEXT_PUBLIC_SOLANA_CLUSTER=localnet`.

**The relayer's public key is hard-coded** (`RELAYER_PUBLIC_KEY`, in eight files:
both pages and six components), so `RELAYER_SECRET_KEY` has to be the key for
`5Yb1Xxss…VR4e`. To use a different relayer, change that constant everywhere.

```bash
npm run dev
```

Open the app at `http://localhost:3000` — with `localhost`, not `127.0.0.1`: the
dev server refuses `127.0.0.1` and the page never becomes interactive. Customer:
`/customer` · Merchant: `/merchant`.

## Features

**Public, before anyone signs in:** the home page lists the ten busiest shops with
each one's five most loyal customers, read straight off the chain, and `/businesses`
searches all of them with a page per category. Every figure is the shop's own
on-chain counter and every slip links to a block explorer, so a visitor can check
any claim without taking the site's word for it. These pages are server-rendered and
carry a sitemap and structured data, because they are the only part of the app a
search engine can read. A new shop appears within seconds of registering: `/api/relay`
clears the directory's cache when it co-signs a `register_business`.

**Merchant:** registration (with a panel explaining that the business becomes an account on Solana), then a dashboard: the business account's address, four counters (cards registered, stamps issued, rewards given, vouchers pending) that stay current on their own, "New sale" with a one-time receipt as a QR code, its own on-chain address and how long it stays valid, the list of presented vouchers with each holder and NFT and a Redeem button (redeeming burns the NFT), top loyal customers by name and by *rewards earned*, not raw stamp count, a "Clean up" button covering expired receipts, vouchers past their 90 days and idle card NFTs (see "Housekeeping," below), and an AI copilot chat bubble with three tested, clickable questions.

**"Change your reward"** lets a merchant edit the reward's name, how many stamps it
takes, the minimum purchase and how long a code lasts — and set the date the offer
runs until. The shop's own name and category are not editable: they are printed into
every card and voucher NFT already in a customer's wallet. The form says what each
change does before it is saved: raising the stamp count is safe for anyone already
collecting, renaming the reward is not, and committing to an end date means the
reward cannot be changed again until it passes (at which point the form goes
read-only and explains why).

**Customer:** sign up / sign in / account recovery via backup phrase, a header showing the wallet (a picture made from its address, the address itself, and an "About your wallet" explanation), the recovery phrase shown once with a button to dismiss it, profile stats, a claim panel (camera QR scanning with manual entry fallback, which also shows which merchant a pasted code came from), "My cards" with a real stamp-row visual, stamps earned and rewards earned, each card's own address, a "Card NFT in your wallet" line with its address (the claim that gives a card its first stamp also creates the NFT, in the same transaction, and cashing in burns it; the line says "No card NFT right now" until the next stamp brings a new one, and after 90 idle days the NFT is recycled the same way — the stamps stay), and Token-2022 NFT vouchers drawn as tickets, each showing when it's valid until (90 days from minting), that can be presented, cancelled or gifted (the list refreshes by itself while a voucher is presented, so a redeemed one disappears without a reload), plus a directory of the customer's own participating businesses.

**"Send stamps to a friend"** sits shut under each card. It asks for the friend's
*wallet* address — the thing they can copy off their own screen — works out their
card, and checks it exists before anything is sent, showing their name and current
stamp count so the sender can confirm the right person. Send stays disabled for a
malformed address, your own wallet, or anyone without a card at that shop. If the
friend needs fewer stamps than you are sending, it says so and offers the smaller
amount in one click: the spare ones are not wasted, they go towards the friend's
next card, but they do still leave yours.

**"Take this wallet with you"** sits shut under the account bar. Opened, it says
plainly that the wallet is the customer's own, shows its address, and will reveal
the 12 words again — after the password is typed a second time, because being signed
in should not be enough to hand over a whole wallet. It is the one place a customer
finds out they can open this account in Phantom or Solflare.

**Staying signed in.** The unlocked key lives in `sessionStorage`, scoped to one tab
and thrown away when that tab closes, so a page refresh no longer drops back to the
sign-in screen. Signing out clears it. The 12 words stay in `localStorage`, encrypted
with the password, exactly as before. The trade-off: anything able to run script in
the page can read the key while the tab is open, which is what the content security
policy is there to prevent.

**The customer page keeps itself current** on an eight-second timer, paused while the
tab is in the background, so stamps a friend sends turn up on their own.

## Architecture notes

**Reads happen at the `confirmed` level.** The connection in `components/WalletContextProvider.tsx` and the one in `lib/analytics.ts` are both created with `"confirmed"`, the same level the relay waits for before it says a transaction is done. Without it, reads default to `finalized`, which trails by about 13 seconds, and every screen shows old data after an action.

**The customer-names store.** The one piece of this app that isn't purely on-chain: a small list in Upstash Redis mapping a wallet address to a chosen display name, so the merchant's "top loyal customers" list and the copilot can show names instead of raw addresses. It stores exactly that — nothing else. Every fact that actually matters (stamps, vouchers, ownership, redemptions) lives entirely on-chain and is unaffected if this list were deleted. It decorates; it never decides.

It used to be a SQLite file, which works on a laptop but not on Vercel (serverless functions have no disk that lasts), so names never saved on the live site. Test names, preview deployments and the live site each get their own list inside the same store (`passdari:customer_names:<environment>`), so trying things out never puts a fake name on the live dashboard.

Setting a name needs a signature from that wallet, so nobody can rename someone else. Reading names needs no signature. Signing in fills in a missing name (the username) for customers who signed up before names could be saved, but never replaces one that is already there.

## Housekeeping

A voucher nobody redeems within 90 days, or a card NFT nobody stamps in 90 days,
would otherwise sit on-chain holding the relayer's rent forever. `/api/cleanup`
(built on `lib/cleanup.ts`) sweeps both up, along with the older case of an
expired, unclaimed receipt, sending each one's rent back to the wallet that
originally paid for it — never to the merchant or customer, and never anywhere
else, since the closing instructions themselves only accept that recorded
address. That's also why none of them need the business owner's or the
customer's signature: only the relayer's, so this can run unattended.

- **The merchant's "Clean up" button** (`components/Housekeeping.tsx`) posts to
  `/api/cleanup` scoped to that merchant's own business.
- **The daily sweep** is a Vercel Cron job (`vercel.json`), configured to run once
  a day and covering every business. Vercel sends it with an `Authorization: Bearer
  $CRON_SECRET` header automatically once that environment variable is set — the
  route refuses to run a sweep with no `business` in the request unless that header
  matches, so set `CRON_SECRET` before relying on it. Vercel Cron needs a paid
  plan for anything more frequent than once a day.
- **A plain GET with a `business` address** just counts what's stale, with no
  side effects — what the merchant's dashboard polls to show the button.

## Security notes

- **Cross-site writes are refused.** The endpoints that change state (relay, copilot, customer-name and cleanup POSTs) return 403 when the browser's `Origin` header names a different site. Requests with no `Origin` (the daily cron job, curl) pass through. CORS is not opened up anywhere, so other sites can't read any response either.
- **Headers and CSP.** Every response carries a Content-Security-Policy limited to this site and its configured RPC endpoint, plus HSTS, `X-Frame-Options: DENY` (the app can't be framed), `nosniff`, a strict referrer policy, a Permissions-Policy that only allows the camera for the QR scanner, and `Cross-Origin-Opener-Policy: same-origin`. Scripts still allow `'unsafe-inline'` because Next.js needs it for its bootstrap code; a nonce-based policy would remove that (see `next.config.ts`).
- **The relay endpoint** only co-signs a transaction if every instruction in it is a call into the Passdari program and the relayer is the fee payer. Payloads over 4,000 characters are refused, and each IP address gets 15 requests a minute.
- **Stamp transfers are capped per wallet, not per IP** — ten a day. Passing stamps to a friend is the one thing a customer can repeat that costs the relayer a fee and hands nothing back, since no account is created and so no rent ever returns; two people could otherwise bounce a single stamp between their cards all day. Per wallet rather than per IP because everyone in one café shares an IP and would knock each other out.
- **The signed-in key survives a reload** in `sessionStorage`, scoped to one tab and cleared when that tab closes or the person signs out. The encrypted 12 words stay in `localStorage` as before; this only holds the already-unlocked key for the life of the tab. The honest trade-off is that script running in the page can read it for that long rather than only while the page is loaded.
- **The copilot** hands out a business's customer data, and a business's address is public on-chain, so it needs proof of ownership. The merchant's browser signs each question with the merchant's wallet (over the owner, the exact question and the time), and the server checks it before doing anything expensive. A signature is good for two minutes either way, so an old copy is useless, and a copy replayed inside that window can only repeat the same question. 10 requests a minute per IP.
- **Display names** are signed the same way (`lib/nameAuth.ts`, a five-minute window, with its own message prefix so a signature for one purpose can't be used for the other). 20 requests a minute per IP.
- **Rate limits are shared.** Every limit above is counted in Upstash Redis (`lib/rateLimit.ts`), so all serverless instances share one count. If the store can't be reached, the check falls back to a per-instance count instead of blocking every real user. Without any Upstash settings, the count is per instance only, which is weaker. The customer-names read endpoint allows 60 requests a minute.
- **Passwords never reach the server.** The wallet key is encrypted in the browser with a key derived from the password using PBKDF2-SHA256. New accounts use 600,000 iterations and record that count with the account; accounts created earlier used 100,000 and still sign in with it. New passwords (sign-up and recovery) must be at least 8 characters. Existing sign-ins aren't checked against this, so nobody is locked out.
- **Secrets** (`RELAYER_SECRET_KEY`, the Gemini key, `CRON_SECRET`, the store's token) live only in environment variables, never in the repo; the repo's full git history has been scanned and contains none of them. `.env*` files and the program's upgrade keypair are git-ignored. GitHub secret scanning and push protection are on for this repo.
- **Dependencies:** `npm audit --omit=dev` reports no critical issues and no unfixed high issue that this app's code paths reach. The remaining moderate items come from `@solana/web3.js` and its transitive packages; the only fix is web3.js 3.x, a breaking major that the pinned Anchor 1.0 stack isn't built against yet. A high-severity advisory in Anchor's `toml` dependency only affects its CLI workspace code, which never parses untrusted input.

## Deploying

The live site is a Vercel project deployed from `main`; every other branch gets a preview. Set the environment variables from the table above for Production, Preview and Development. The names store comes from Vercel's Upstash Redis integration (Storage, then connect it to the project for all environments and leave the custom prefix empty). Vercel doesn't apply new or changed variables to existing deployments, so redeploy after changing them.

The app and the program on devnet have to stay in step: a program upgrade that
changes an instruction's arguments or accounts breaks the previous version of the
app until the new one is deployed. Two of those have shipped, and the order that
works is:

1. `solana program extend <program-id> <bytes>` if the build has outgrown its space
2. Upgrade the program
3. **Immediately** run `node scripts/migrate-accounts.cjs` — an account that has
   grown is shorter than the struct the new program expects, so it cannot be read
   at all until it has been migrated, and those customers see nothing in the
   meantime. The script is idempotent, has a `--dry-run`, finds old accounts by
   size rather than by decoding them, and reports anything left over.
4. Push the app
5. Verify

The site is down between steps 2 and 4. Keep that window to minutes.

Set `CRON_SECRET` before or right after the first deploy, so the daily clean-up sweep (see "Housekeeping," above) runs rather than refusing itself.

## Known limitations

- Checked at phone widths (320 to 414 pixels) in a headless browser, but never tested on a real mobile device. The camera scanner in particular needs HTTPS to work on a phone at all; a manual code-entry fallback exists for exactly this reason.
- There are no automated tests for the frontend in this repo. It was checked by driving the real screens in a headless browser, against a local chain and against devnet; those scripts are not part of this repo. Every feature above was verified that way, along with an axe-core accessibility audit of every screen and a check that nothing scrolls sideways at phone width.
- The AI copilot's live-fallback templates only cover its three fixed questions; a freely-typed question that fails gets an honest "temporarily unavailable" message instead.
- Purchase-band distribution (small/medium/large) isn't available to the AI copilot — the exact band is discarded once a receipt is claimed, by design, for customer privacy.
- A customer can set their own display name to any text, and names are passed to the AI copilot. The worst this can do is change the wording of an answer only that merchant sees.
- The voucher and card NFTs' metadata links point at small pages (`/v/<mint>`, `/c/<mint>`) that return a description and a picture (`public/nft/passdari-voucher.png`, `passdari-card.png`). It is one picture for all vouchers and one for all cards, with no business name on it, and this app serves it, so it depends on the app staying up. Ownership itself stays on-chain.
- Lists refresh by checking every few seconds (the presented-voucher lists), not by subscription.
- **Anyone can make a merchant account, and the relayer pays for it.** The relay will co-sign `register_business` for any wallet, so someone could create many businesses at the relayer's expense. A business's rent can now be reclaimed once it has finished trading (`close_business`), but only long after the fact, and nothing stops the registrations in the first place. The per-IP rate limit slows this down but doesn't stop it. Planned fix: only approved merchant wallets get relayed registrations, and the relayer gets a daily SOL budget cap. **This is the largest remaining hole; treat relayer spending as uncapped until it is closed.**
- **The 15-a-minute per-IP relay limit will throttle a busy shop.** Customers using the shop's own wifi all share one address. It is not a problem at today's size and is a certainty at a few hundred customers a shop.
- **The per-wallet transfer cap bounds one person, not everyone.** Ten a day is 0.003 SOL a month per wallet; if every wallet maxed it out at fifty thousand cards that would be 150 SOL a month. The global daily budget cap above is the real backstop.
- **The devnet directory contains test data.** Roughly fifty shops are leftovers from end-to-end test runs, and they cannot be removed: nothing could close a business account until recently, and their owner keys were random and discarded. Real demo shops rank above them by activity, so they sit below the fold.
- **The browser-side Helius RPC URL is public.** `NEXT_PUBLIC_HELIUS_RPC_URL` is compiled into the page, so its API key is visible to anyone who loads the site. It is a read-only RPC key and can't move funds, but someone could use up its quota. Replace it with a restricted key for the browser when there's time.

## What changed recently

- **A public shop directory** on the home page and at `/businesses`, server-rendered
  with a sitemap and structured data, plus category pages. Shops' categories are now
  a fixed list: when it was a free text box, one kind of shop ended up split across
  four spellings with a quarter of the shops behind each.
- **"Take this wallet with you"** — the one place a customer learns the account is a
  Solana wallet they can open anywhere.
- **Passing stamps to a friend,** with a pre-send check on the recipient and a
  warning when you are sending more than they need.
- **Staying signed in across a reload,** and a customer page that keeps itself
  current instead of needing one.
- **A merchant form for the reward terms,** including the date an offer runs until.
- **Cheaper cards.** The separate per-NFT rent record is gone (it cost 858,520
  lamports to hold 32 useful bytes), the NFT's on-chain name and link are shorter,
  and a card created today holds about 0.00107 SOL less than before.
- **Everything can be closed now.** `close_dead_card` and `close_business` return the
  last two kinds of rent that were permanently stranded.
- **A security hole closed:** a shop could set "stamps needed" to zero, which let one
  stamp buy reward after reward at the relayer's expense. Settings are validated now.

## The relayer's operational story

The relayer's real secret key lives in the `RELAYER_SECRET_KEY` environment variable — a JSON array of its 64 bytes, set in the hosting platform's own settings, never in the repo — and is read by `/api/relay/route.ts`. (An older version read a `relayer-keypair.json` file from disk. The code no longer does; if you still have that git-ignored file, it is where you can get the array from.)

**Nobody currently monitors the relayer's balance.** If it runs dry, every single action across both the merchant and customer sides stops at once — this is by design load-bearing infrastructure, not a per-feature dependency. Before any real demo: fund it well above what the session could plausibly need, and check its actual balance the same morning, rather than trust it was still funded from an earlier session.

**What the app shows if it happens anyway:** every component routes its errors through `lib/errorMessages.ts`, and a genuinely empty relayer gets its own distinct message — clearly different in tone from an ordinary mistake, explicitly telling the person "this isn't something you did." It's a real, visible message either way, never a silent hang — but it's still a full outage, not something the app can route around on its own.

Both connections take their address from the environment (`HELIUS_RPC_URL` for the server, `NEXT_PUBLIC_HELIUS_RPC_URL` for the browser) and fall back to the public devnet endpoint if it is missing.

