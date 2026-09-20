# Passdari — Web App

The web frontend for the Passdari dApp — two interfaces in one app: a merchant
dashboard and a customer loyalty wallet, both talking to the on-chain program in
[`stampcoin`](https://github.com/AbdullahFarrukh/stampcoin). Neither side installs
a wallet extension, and neither side ever holds or spends SOL — a backend relayer
covers every fee and every account's rent, for both.

---

## The two interfaces

**Neither merchants nor customers touch a wallet extension.** Both sign up with
just a username and password. Under the hood, the app generates a real Solana
keypair from a proper BIP-39 mnemonic phrase, encrypts it with their password,
and stores it in the browser. The 12-word phrase is shown once, at sign-up, with
a clear warning it can never be shown again — the only way to recover an account
afterward.

**Merchants** — after signing in, the app checks whether a `Business` PDA exists
for that keypair; if not, a registration form; if so, straight to the dashboard.

**Customers** route straight to their own interface — no role check needed,
since only a merchant's own choice to register creates a `Business` at all.

## Stack

- Next.js (App Router) + Tailwind v4
- A fee-payer relayer (Node's `fs` reading a server-only keypair file, never sent to the browser) — see the program repo's "Who pays" section
- Anchor's TypeScript client (`@anchor-lang/core`)
- `bip39` + `ed25519-hd-key` for both merchant and customer key generation
- `react-zxing` for the camera QR scanner, with manual code entry as a mandatory fallback
- `@google/genai` (Gemini) for the AI copilot, with three fixed, clickable questions and a real, honest fallback (plain-templated real data, clearly labeled) if the live AI call fails
- Upstash Redis (`@upstash/redis`) for one small list: customer display names
- IBM Plex Sans / IBM Plex Mono, custom color palette (kraft paper background, ink-blue and stamp-red accents) — see `app/globals.css`

## Running locally

**Prerequisite:** the `stampcoin` program built and running via `anchor localnet` in a separate terminal — this app talks to it over `127.0.0.1:8899`.

```bash
npm install
```

Create `.env.local`:

GEMINI_API_KEY=your-key-here

Optional, for customer display names: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or the `KV_REST_API_URL` / `KV_REST_API_TOKEN` pair that Vercel's Upstash integration sets). Without them, `npm run dev` still works: names are kept in memory and disappear when the dev server restarts. On a production build, saving a name fails with a clear error instead.


(Get a free key at [aistudio.google.com](https://aistudio.google.com) — no billing required for the free tier.)

You'll also need a funded relayer keypair — see `relayer-keypair.json` (kept out of git; generate your own with `solana-keygen new`) and airdrop it some local SOL.

```bash
npm run dev
```

Homepage (choose customer or merchant): `localhost:3000` · Merchant: `localhost:3000/merchant` · Customer: `localhost:3000/customer`

## Features

**Merchant:** registration, live dashboard (cards, stamps, rewards, top loyal customers by name and by *rewards redeemed*, not raw stamp count), "New sale" with QR code generation, a "Clean up expired receipts" button that reclaims rent back to the relayer, presented-voucher redemption, an AI copilot chat bubble with three tested, clickable questions.

**Customer:** sign up / sign in / account recovery via backup phrase, "My cards" with a real stamp-row visual (not a generic progress bar), profile stats, a business directory of the customer's own participating businesses (shown once they've claimed their first stamp), camera QR scanning with manual entry fallback, minting, presenting, cancelling, and gifting vouchers.

## Architecture note: the customer-names store

The one piece of this app that isn't purely on-chain: a small list in Upstash Redis mapping a wallet address to a chosen display name, so the merchant's "top loyal customers" list and the copilot can show names instead of raw addresses. It stores exactly that — nothing else. Every fact that actually matters (stamps, vouchers, ownership, redemptions) lives entirely on-chain and is unaffected if this list were deleted. It decorates; it never decides.

It used to be a SQLite file, which works on a laptop but not on Vercel (serverless functions have no disk that lasts), so names never saved on the live site. Test names, preview deployments and the live site each get their own list inside the same store (`passdari:customer_names:<environment>`), so trying things out never puts a fake name on the live dashboard.

## Known limitations

- Never tested on a real mobile device — only a desktop browser so far. The camera scanner in particular needs HTTPS to work on a phone at all; a manual code-entry fallback exists for exactly this reason.
- The relay endpoint currently trusts anything it's asked to sign — no rate-limiting or instruction validation yet.
- The AI copilot's live-fallback templates only cover its three fixed questions; a freely-typed question that fails gets an honest "temporarily unavailable" message instead.
- Purchase-band distribution (small/medium/large) isn't available to the AI copilot — the exact band is discarded once a receipt is claimed, by design, for customer privacy.

## The relayer's operational story

The relayer's real secret key lives in `relayer-keypair.json`, a plain file sitting in this project's root, read directly off disk (`fs.readFileSync`) by `/api/relay/route.ts`. It's git-ignored, so it never leaves this machine — but this is genuinely a local-development pattern, not a production one. Before ever deploying this app anywhere real, that file would need to move into a proper secret store (a platform's own environment variables, at minimum, ideally a real secrets manager) — reading a plain file off disk is not something a deployed serverless function should be trusted to do with a real key.

**Nobody currently monitors the relayer's balance.** If it runs dry, every single action across both the merchant and customer sides stops at once — this is by design load-bearing infrastructure, not a per-feature dependency. Before any real demo: fund it well above what the session could plausibly need, and check its actual balance the same morning, rather than trust it was still funded from an earlier session.

**What the app shows if it happens anyway:** every component routes its errors through `lib/errorMessages.ts`, and a genuinely empty relayer gets its own distinct message — clearly different in tone from an ordinary mistake, explicitly telling the person "this isn't something you did." It's a real, visible message either way, never a silent hang — but it's still a full outage, not something the app can route around on its own.

- Both `lib/customerProgram.ts` and `lib/analytics.ts` currently point at `127.0.0.1:8899` directly — these are the places that would need updating before pointing this app at devnet instead of a local validator.