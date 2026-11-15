# SSN

Solana social app with a feed, chat, profiles, a blog, premium badges, and an admin panel.

The GitHub repo is still called BSN. The product name is SSN.

## Features

- Landing page, then the app. Wallets: Phantom, Solflare, Torus, and Ledger, on Solana mainnet.
- Feed backed by Firebase, with a For You / Following toggle, likes, threaded comments, comment images, reposts, and reports. A new post is shown before the mint confirms.
- Creating a post uploads metadata, and an optional image, to IPFS through Pinata, then mints a Metaplex NFT. The feed reads Firebase, not the chain.
- Profiles with a display name, bio, website, follow counts, and an avatar. Missing avatars fall back to a Dicebear image derived from the address.
- Direct messages over Firebase Realtime Database, with presence, unread state, and the ability to hide a thread for yourself.
- Blog posts created in the admin panel. The public view renders a small Markdown subset.
- Premium blue (0.02 SOL) and gold (0.05 SOL) badges. Payment is a SOL transfer, and a successful payment activates a 30-day badge.
- Admin at `/admin` for reports, hidden posts, blogs, badges, and users. Login and badge changes use two different passwords.
- An analytics view for the connected account, charted from that account's posts.

Direct links: `/post/:id`, `/blog`, `/premium`, `/admin`, and `/?profile=<address>`.

## Stack

- React 18, TypeScript, Vite 6
- Tailwind CSS from the CDN, Lucide, Recharts
- `@solana/web3.js` and the Solana wallet adapter
- Metaplex (`@metaplex-foundation/js`) for post NFTs
- Pinata for IPFS
- Firebase Realtime Database and Storage
- Express 5 and Multer for uploads and the admin password checks

## Setup

Node.js 20 or newer.

```bash
npm install
cp .env.example .env
```

Fill in `.env`. Vite loads the `VITE_` names from that file into the client. `ADMIN_PASSWORD` and `BADGE_PASSWORD` are read from the process environment by `server.js` and by the Vite dev middleware. Export them in the shell, or set them on the host. Putting them only in `.env` does not make the admin routes see them.

```bash
npm run dev
```

Dev server: http://localhost:5000. It also serves `/uploads` and the `/api` routes.

```bash
npm run build
npm start
```

`npm start` serves `dist/` on `PORT` (default 5000). Build before starting it.

## Environment

Names only. Values go in `.env` or the host environment, never in source.

| Variable | Who reads it |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase client |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase client |
| `VITE_FIREBASE_DATABASE_URL` | Firebase client |
| `VITE_FIREBASE_PROJECT_ID` | Firebase client |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase client |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase client |
| `VITE_FIREBASE_APP_ID` | Firebase client |
| `VITE_PINATA_API_KEY` | IPFS uploads from the browser |
| `VITE_PINATA_SECRET_KEY` | IPFS uploads from the browser |
| `VITE_HELIUS_RPC_URL` | Solana RPC. Public mainnet is the fallback |
| `VITE_PREMIUM_PAYMENT_ADDRESS` | Destination of badge payments |
| `ADMIN_PASSWORD` | `POST /api/admin/verify` |
| `BADGE_PASSWORD` | `POST /api/admin/verify-badge-password` |
| `PORT` | Express listen port, default 5000 |

## Project structure

```
index.html                     page shell and Tailwind theme
index.tsx                      React entry
App.tsx                        navigation, routes, composer
views/                         feed, chat, profile, post, blog, premium, admin, landing, analytics
components/                    shared UI, badges, lazy images
services.ts                    feed cache, optimistic posts, chat helpers
firebaseService.ts             Realtime Database access
firebaseConfig.ts              Firebase init
solanaService.ts               RPC connection, balances, badge payments
solanaBlockchainService.ts     wallet profile, mint, repost
metaplexService.ts             NFT mint
ipfsService.ts                 Pinata uploads
encryptionService.ts           chat encryption
WalletContextProvider.tsx      wallet adapter
server.js                      production server: static files, uploads, admin checks
vite.config.ts                 dev server, the same API routes, dependency aliases
uploads/                       local avatars and comment images, not committed
public/                        badge art and the Search Console file
```

## Design notes

- The wallet address is the user id. There is no email login. Profiles, follows, likes, comments, blogs, and the feed live in Firebase, so the social graph is not on-chain.
- A post NFT is immutable, supply 1, symbol `SSNPOST`, with no royalties. The client refuses to mint when the balance is under 0.02 SOL. The Firebase copy is what the feed queries.
- Chat text is encrypted in the browser with AES-GCM before it is written to Firebase. The key is derived from a constant shipped in the client and the two wallet addresses. Anyone with this client can decrypt stored messages. It keeps message bodies from sitting in Firebase as plaintext. It is not secrecy between the two participants.
- The display name is stored on the profile as `ens`. That field name is old. It is not an ENS lookup, and renaming it would orphan existing profiles.
- Pinata credentials are sent from the browser. Proxy uploads if the secret needs to stay off the client.
- Admin auth is a shared password compared on the server, not a user account. Badge assign and revoke ask for a second password.
- Browser storage keys are still prefixed `bsn_` (`bsn_current_view`, `bsn_passed_landing`, and the chat hide/read sets) so existing sessions keep their place.
- Avatars and comment images are written to `uploads/` on the machine running the server. They are gitignored.
