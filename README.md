# Loyalty — Web App

The web frontend for the Loyalty dApp — two interfaces in one app: a merchant dashboard and a customer loyalty wallet, both talking to the on-chain program in [`loyalty`](https://github.com/YOUR-USERNAME/loyalty).

---

## The two interfaces

**Merchants** connect via Phantom (standard Solana wallet). If their wallet already owns a registered business, they see their dashboard; otherwise, a registration form.

**Customers** never touch a wallet extension at all — they sign up with a username and password. Under the hood, the app generates a real Solana keypair from a proper BIP-39 mnemonic phrase, encrypts it with their password, and stores it in the browser. The 12-word phrase is shown once, at sign-up, with a clear warning it can never be shown again — the only way to recover an account afterward.

## Stack

- Next.js (App Router) + Tailwind v4
- Solana Wallet Adapter (merchant side only)
- Anchor's TypeScript client (`@anchor-lang/core`)
- `bip39` + `ed25519-hd-key` for customer key generation
- `react-zxing` for the camera QR scanner, with manual code entry as a mandatory fallback
- `@google/genai` (Gemini) for the AI copilot
- `node:sqlite` (built into Node — no separate install) for one small table: customer display names
- IBM Plex Sans / IBM Plex Mono, custom color palette (kraft paper background, ink-blue and stamp-red accents) — see `app/globals.css`

## Running locally

**Prerequisite:** the `loyalty` program built and running via `anchor localnet` in a separate terminal — this app talks to it over `127.0.0.1:8899`.

```bash
npm install
```

Create `.env.local`:

GEMINI_API_KEY=your-key-here


(Get a free key at [aistudio.google.com](https://aistudio.google.com) — no billing required for the free tier.)

```bash
npm run dev
```

Merchant interface: `localhost:3000` · Customer interface: `localhost:3000/customer`

## Features

**Merchant:** registration, live dashboard (cards, stamps, rewards, top loyal customers by name), "New sale" with QR code generation, presented-voucher redemption, an AI copilot chat bubble that answers plain-English questions about the business's own on-chain data.

**Customer:** sign up / sign in / account recovery via backup phrase, "My cards" with a real stamp-row visual (not a generic progress bar), profile stats, a business directory (shown once a customer has claimed their first stamp), camera QR scanning with manual entry fallback, minting, presenting, cancelling, and gifting vouchers.

## Architecture note: the customer-names database

The one piece of this app that isn't purely on-chain: a small SQLite database mapping a wallet address to a chosen display name, so the merchant's "top loyal customers" list can show names instead of raw addresses. It stores exactly that — nothing else. Every fact that actually matters (stamps, vouchers, ownership, redemptions) lives entirely on-chain and is unaffected if this database were deleted. It decorates; it never decides.

## Known limitations

- Never tested on a real mobile device — only a desktop browser so far. The camera scanner in particular needs HTTPS to work on a phone at all; a manual code-entry fallback exists for exactly this reason.
- The AI copilot's "busiest day/hour" and repeat-visit stats are only available by asking — there's no permanent stat card for them on the dashboard yet.
- Purchase-band distribution (small/medium/large) isn't available to the AI copilot — the exact band is discarded once a receipt is claimed, by design, for customer privacy.
- Both the client (`components/WalletContextProvider.tsx`) and server (`lib/analytics.ts`) currently point at `127.0.0.1:8899` directly — these are the two places that would need updating before pointing this app at devnet instead of a local validator.