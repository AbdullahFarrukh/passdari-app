# StampCoin — Web App

The web frontend for the StampCoin dApp — two interfaces in one app: a merchant
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
- `node:sqlite` (built into Node — no separate install) for one small table: customer display names
- IBM Plex Sans / IBM Plex Mono, custom color palette (kraft paper background, ink-blue and stamp-red accents) — see `app/globals.css`

## Running locally

**Prerequisite:** the `stampcoin` program built and running via `anchor localnet` in a separate terminal — this app talks to it over `127.0.0.1:8899`.

```bash
npm install
```

Create `.env.local`:

GEMINI_API_KEY=your-key-here


(Get a free key at [aistudio.google.com](https://aistudio.google.com) — no billing required for the free tier.)

You'll also need a funded relayer keypair — see `relayer-keypair.json` (kept out of git; generate your own with `solana-keygen new`) and airdrop it some local SOL.

```bash
npm run dev
```

Homepage (choose customer or merchant): `localhost:3000` · Merchant: `localhost:3000/merchant` · Customer: `localhost:3000/customer`

## Features

**Merchant:** registration, live dashboard (cards, stamps, rewards, top loyal customers by name and by *rewards redeemed*, not raw stamp count), "New sale" with QR code generation, a "Clean up expired receipts" button that reclaims rent back to the relayer, presented-voucher redemption, an AI copilot chat bubble with three tested, clickable questions.

**Customer:** sign up / sign in / account recovery via backup phrase, "My cards" with a real stamp-row visual (not a generic progress bar), profile stats, a business directory (shown once a customer has claimed their first stamp), camera QR scanning with manual entry fallback, minting, presenting, cancelling, and gifting vouchers.

## Architecture note: the customer-names database

The one piece of this app that isn't purely on-chain: a small SQLite database mapping a wallet address to a chosen display name, so the merchant's "top loyal customers" list can show names instead of raw addresses. It stores exactly that — nothing else. Every fact that actually matters (stamps, vouchers, ownership, redemptions) lives entirely on-chain and is unaffected if this database were deleted. It decorates; it never decides.

## Known limitations

- Never tested on a real mobile device — only a desktop browser so far. The camera scanner in particular needs HTTPS to work on a phone at all; a manual code-entry fallback exists for exactly this reason.
- The relay endpoint currently trusts anything it's asked to sign — no rate-limiting or instruction validation yet.
- The AI copilot's live-fallback templates only cover its three fixed questions; a freely-typed question that fails gets an honest "temporarily unavailable" message instead.
- Purchase-band distribution (small/medium/large) isn't available to the AI copilot — the exact band is discarded once a receipt is claimed, by design, for customer privacy.
- Both `lib/customerProgram.ts` and `lib/analytics.ts` currently point at `127.0.0.1:8899` directly — these are the places that would need updating before pointing this app at devnet instead of a local validator.