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
- Upstash Redis (`@upstash/redis`) for one small list: customer display names
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
| `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or Vercel's `KV_REST_API_URL` and `KV_REST_API_TOKEN`) | The store for customer display names | Optional. Without them names are kept in memory and disappear when the dev server restarts. A production build refuses to save a name instead, with a clear error |
| `CRON_SECRET` | Guards the daily clean-up sweep (see below); Vercel sets this as the request's bearer token automatically once the variable exists | Recommended in production; without it the sweep refuses to run rather than run unguarded |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` (default), `localnet` or `mainnet-beta`, for the Explorer links | Optional |

**Point it at devnet** (what the live site does): set the two RPC addresses to a
devnet endpoint and fund the relayer with a few devnet SOL. The relayer's rent
comes back: a receipt's when it is claimed or cleaned up, a card NFT's (about
0.006 SOL) when the card is cashed in or its NFT is recycled after 90 idle days,
and a voucher's (about 0.008 SOL) when it is redeemed or closed after its 90 days
run out. What it really spends is transaction fees, about 0.00002 SOL per stamp,
plus a one-time deposit for each business and each stamp card. The app passes each
receipt's and voucher's recorded `rentPayer` when closing it — see `lib/cleanup.ts`
and "Housekeeping," below.

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

**Merchant:** registration (with a panel explaining that the business becomes an account on Solana), then a dashboard: the business account's address, four counters (cards registered, stamps issued, rewards given, vouchers pending) that stay current on their own, "New sale" with a one-time receipt as a QR code, its own on-chain address and how long it stays valid, the list of presented vouchers with each holder and NFT and a Redeem button (redeeming burns the NFT), top loyal customers by name and by *rewards earned*, not raw stamp count, a "Clean up" button covering expired receipts, vouchers past their 90 days and idle card NFTs (see "Housekeeping," below), and an AI copilot chat bubble with three tested, clickable questions. A "Demo tools" fold holds a button that lowers the reward threshold to 1 for demos.

**Customer:** sign up / sign in / account recovery via backup phrase, a header showing the wallet (a picture made from its address, the address itself, and an "About your wallet" explanation), the recovery phrase shown once with a button to dismiss it, profile stats, a claim panel (camera QR scanning with manual entry fallback, which also shows which merchant a pasted code came from), "My cards" with a real stamp-row visual, stamps earned and rewards earned, each card's own address, a "Card NFT in your wallet" line with its address (the claim that gives a card its first stamp also creates the NFT, in the same transaction, and cashing in burns it; the line says "No card NFT right now" until the next stamp brings a new one, and after 90 idle days the NFT is recycled the same way — the stamps stay), and Token-2022 NFT vouchers drawn as tickets, each showing when it's valid until (90 days from minting), that can be presented, cancelled or gifted (the list refreshes by itself while a voucher is presented, so a redeemed one disappears without a reload), plus a directory of the customer's own participating businesses.

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

- **The relay endpoint** only co-signs a transaction if every instruction in it is a call into the Passdari program and the relayer is the fee payer. Payloads over 4,000 characters are refused, and each IP address gets 15 requests a minute.
- **The copilot** hands out a business's customer data, and a business's address is public on-chain, so it needs proof of ownership. The merchant's browser signs each question with the merchant's wallet (over the owner, the exact question and the time), and the server checks it before doing anything expensive. A signature is good for two minutes either way, so an old copy is useless, and a copy replayed inside that window can only repeat the same question. 10 requests a minute per IP.
- **Display names** are signed the same way (`lib/nameAuth.ts`, a five-minute window, with its own message prefix so a signature for one purpose can't be used for the other). 20 requests a minute per IP.
- All of the limits above are kept in memory inside each serverless instance, so they reset on a cold start and aren't shared between instances. They stop a naive script, not a determined attacker.
- Secrets (`RELAYER_SECRET_KEY`, the Gemini key, the store's token) live only in environment variables. `.env*` files are git-ignored.

## Deploying

The live site is a Vercel project deployed from `main`; every other branch gets a preview. Set the environment variables from the table above for Production, Preview and Development. The names store comes from Vercel's Upstash Redis integration (Storage, then connect it to the project for all environments and leave the custom prefix empty). Vercel doesn't apply new or changed variables to existing deployments, so redeploy after changing them.

The app and the program on devnet have to stay in step: a program upgrade that changes an instruction's arguments or accounts breaks the previous version of the app until the new one is deployed.

Set `CRON_SECRET` before or right after the first deploy, so the daily clean-up sweep (see "Housekeeping," above) runs rather than refusing itself.

## Known limitations

- Checked at phone widths (320 to 414 pixels) in a headless browser, but never tested on a real mobile device. The camera scanner in particular needs HTTPS to work on a phone at all; a manual code-entry fallback exists for exactly this reason.
- There are no automated tests for the frontend in this repo. It was checked by driving the real screens in a headless browser, against a local chain and against devnet; those scripts are not part of this repo.
- The AI copilot's live-fallback templates only cover its three fixed questions; a freely-typed question that fails gets an honest "temporarily unavailable" message instead.
- Purchase-band distribution (small/medium/large) isn't available to the AI copilot — the exact band is discarded once a receipt is claimed, by design, for customer privacy.
- A customer can set their own display name to any text, and names are passed to the AI copilot. The worst this can do is change the wording of an answer only that merchant sees.
- The voucher and card NFTs' metadata links point at small pages (`/v/<mint>`, `/c/<mint>`) that return a description and a picture (`public/nft/passdari-voucher.png`, `passdari-card.png`). It is one picture for all vouchers and one for all cards, with no business name on it, and this app serves it, so it depends on the app staying up. Ownership itself stays on-chain.
- Lists refresh by checking every few seconds (the presented-voucher lists), not by subscription.

## The relayer's operational story

The relayer's real secret key lives in the `RELAYER_SECRET_KEY` environment variable — a JSON array of its 64 bytes, set in the hosting platform's own settings, never in the repo — and is read by `/api/relay/route.ts`. (An older version read a `relayer-keypair.json` file from disk. The code no longer does; if you still have that git-ignored file, it is where you can get the array from.)

**Nobody currently monitors the relayer's balance.** If it runs dry, every single action across both the merchant and customer sides stops at once — this is by design load-bearing infrastructure, not a per-feature dependency. Before any real demo: fund it well above what the session could plausibly need, and check its actual balance the same morning, rather than trust it was still funded from an earlier session.

**What the app shows if it happens anyway:** every component routes its errors through `lib/errorMessages.ts`, and a genuinely empty relayer gets its own distinct message — clearly different in tone from an ordinary mistake, explicitly telling the person "this isn't something you did." It's a real, visible message either way, never a silent hang — but it's still a full outage, not something the app can route around on its own.

Both connections take their address from the environment (`HELIUS_RPC_URL` for the server, `NEXT_PUBLIC_HELIUS_RPC_URL` for the browser) and fall back to the public devnet endpoint if it is missing.

