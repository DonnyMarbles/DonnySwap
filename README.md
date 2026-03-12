# DonnySwap

Composable DEX front-end plus supporting services for the PEAQ EVM network. The app lets users swap MRBL/PEAQ/WPEAQ pairs, manage LP positions, inspect token balances, mint DSFO NFTs, and monitor protocol fees while streaming live PEAQ pricing data from multiple oracles.

## Table of Contents
- [Highlights](#highlights)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Repository Layout](#repository-layout)
- [Requirements](#requirements)
- [Configuration](#configuration)
  - [Frontend (`.env`)](#frontend-env)
  - [Backend (`backend/.env`)](#backend-env)
  - [Operational scripts (`scripts/.env`)](#operational-scripts-env)
  - [Database schema](#database-schema)
- [Install Dependencies](#install-dependencies)
- [Run the App Locally](#run-the-app-locally)
- [Build & Deploy](#build--deploy)
- [Backend API Reference](#backend-api-reference)
- [Operational Scripts](#operational-scripts)
- [Smart Contracts & ABIs](#smart-contracts--abis)
- [Linting & Formatting](#linting--formatting)
- [Troubleshooting](#troubleshooting)

## Highlights
- **DEX actions** – Swap, wrap/un‑wrap WPEAQ, and manage ERC‑20 & native PEAQ liquidity positions from dedicated routes.
- **Token intelligence** – Token pair explorer and balances dashboard hydrate from on-chain reserves plus a strict curated token list (`src/assets/tokenList.js`).
- **Address conversion** – Convert between H160 (EVM), SS58 (Substrate), and raw public keys using the in-app converter powered by `lib/addressUtils`.
- **DSFO participation** – Mint DSFO NFTs, view ownership %, and inspect global/user fee accruals calculated from on-chain data + cached backend analytics.
- **Price & supply services** – The backend fuses Acelon SDK, CoinGecko, CoinPaprika, and Subscan data to expose `/fetch-peaq-price`, `/token-prices`, and `/peaq-token-metrics` endpoints with caching and rate-limit protection.
- **Automation ready** – Long-running scripts (`scripts/feesListener.js`, `scripts/purgeFees.js`) keep the analytics tables in sync and allow maintenance operations.

## Tech Stack & Architecture
- **Frontend**: React 19, Vite 7, Styled Components, Suspense-based route splitting, custom wallet context built on `viem`, TanStack Query provider (ready for data hooks), Zustand-ready structure, and RainbowKit-compatible dependencies.
- **Backend API**: Express 5, PostgreSQL (`pg`), Axios, Acelon SDK, CoinGecko/CoinPaprika integrations, Subscan supply ingestion, in-memory caches, and permissive CORS for DEX clients.
- **Data layer**: PostgreSQL schema defined in `db_queries/remove_old_and_create_new.sql` with fee records, DSFO mint/burn data, and ERC‑20 metadata.
- **Contracts & ABIs**: Solidity sources under `contracts/` plus fetched ABIs in `src/ABIs/` (Uniswap V2, FeeManager, DSFO NFT, ERC‑20, Wrapped PEAQ).
- **Automation**: Standalone Node scripts (ES modules) for fee distributions and database hygiene.

## Repository Layout
```
.
├── src/                 # React application (features, contexts, hooks, styles)
├── backend/             # Express server + API integrations
├── scripts/             # Long-running maintenance scripts
├── contracts/           # Solidity sources for FeeManager & DSFO minting
├── db_queries/          # PostgreSQL schema & utility SQL
├── dist/                # Production build output (created by `npm run build`)
├── example.env          # Sample Vite env
├── package.json         # Root workspace scripts & deps
└── vite.config.js       # Vite + proxy configuration
```

## Requirements
- Node.js **18.20+** (supports Vite 7, React 19, and ES modules used across backend/scripts)
- npm **10+** (or compatible Yarn/PNPM)
- PostgreSQL **14+** with the `citext` extension enabled
- Access to a PEAQ RPC (defaults to `https://peaq.betterfuturelabs.xyz`)
- CoinGecko (optional) and Subscan API keys for rate-limit friendly price/supply data

## Configuration

### Frontend (`.env`)
```
cp example.env .env
```
| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL used by `apiUrl()` inside the React app (include `/api` if your reverse proxy expects it). |
| `VITE_PROXY_API_TARGET` | Target URL for the Vite dev-server proxy (typically `http://localhost:3002`). |
| `VITE_PROXY_API_PREFIX` | Prefix inserted when proxying. Set to blank (`''`) if the Express server runs at the root; keep `/api` if your reverse proxy strips nothing. |

> `apiUrl()` falls back to `/api` on localhost, so be sure your proxy removes that prefix before requests hit Express (or mount Express under `/api`).

### Backend (`backend/.env`)
```
cp backend/example.env backend/.env
```
| Variable | Purpose |
| --- | --- |
| `PG*` / `DATABASE_URL` | Standard PostgreSQL connection settings. SSL can be disabled with `PGSSL='false'` for local use. |
| `PEAQ_RPC_HTTP` / `PEAQ_WS_ENDPOINT` | RPC endpoints used for balance checks and listener scripts. |
| `COINGECKO_API_KEY`, `SUBSCAN_API_KEY` | Optional keys that unlock higher rate limits for price/supply data. |
| `PEAQ_SUBSCAN_TOKEN_ENDPOINT`, `PEAQ_COINGECKO_ID`, etc. | Override defaults when pointing to alternate explorers or listings. |
| `PORT` | Overrides the default Express port (`3002`). |

### Operational scripts (`scripts/.env`)
```
cp scripts/example.env scripts/.env
```
| Variable | Purpose |
| --- | --- |
| `FEE_LISTENER_RPC_URL`, `FEE_MANAGER_ADDRESS` | Chain RPC and contract used by the fee distribution listener. |
| `MNEMONIC` / `FEE_MANAGER_OWNER_KEY` | Credentials needed to call `triggerBreakdownAndDistribution`. |
| `FEE_LISTENER_API_BASE_URL` | Points to the backend API that records user fees. |
| `FEE_LISTENER_CHAIN_ID`, `FEES_LISTENER_INTERVAL_MS` | Chain metadata and polling cadence (defaults to every 4 hours). |
| `PG*` / `DATABASE_URL` | Required for `scripts/purgeFees.js`. |

### Database schema
Initialize a database (local Docker, managed instance, etc.), then run the canonical schema:
```bash
psql "$DATABASE_URL" -f db_queries/remove_old_and_create_new.sql
```
The script provisions:
- `block_listener_progress`, `user_fees`, `erc20_tokens` for fee accounting
- `dsfo_mints`, `dsfo_burns`, `dsfo_holder_balances` for NFT lifecycle tracking
- `fee_batches`, `fee_allocations` for per-distribution bookkeeping

## Install Dependencies
```bash
npm install
cd scripts && npm install
```
The root install covers both the React app and backend because they share the same `package.json`. The scripts folder has its own lightweight dependencies.

## Run the App Locally
1. **Start PostgreSQL & load env files** – ensure `backend/.env` points to a reachable database populated with the schema above.
2. **Launch the backend API**
   ```bash
   node backend/server.js
   # runs on http://localhost:3002 by default
   ```
3. **Run the Vite dev server**
   ```bash
   npm run dev
   # open http://localhost:5173
   ```

During development the Vite proxy forwards `/api/*` calls to the backend. Adjust `VITE_PROXY_API_PREFIX` if your Express server is not namespaced.

## Build & Deploy
```bash
npm run build          # produces static assets under dist/
npm run preview        # serves the build locally for smoke tests
```
- Deploy the `dist/` directory via any static host (S3, Cloudflare Pages, Nginx, etc.).
- Run `node backend/server.js` (or your preferred process manager) behind HTTPS and expose it under the same base URL configured in `VITE_API_BASE_URL`.
- When hosting behind a reverse proxy, forward `/api/*` to the backend and strip the prefix if Express runs at `/`.

## Backend API Reference
All routes are rooted at the Express server (defaults shown without `/api`; add your proxy prefix if applicable).

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/fetch-peaq-price` | Returns `{ price }` sourced from Acelon SDK → CoinGecko → CoinPaprika with caching/fallbacks. |
| `POST` | `/token-prices` | Accepts `{ tokens: [{ symbol, coingeckoId }] }` and returns cached USD prices for supported tokens. |
| `POST` | `/peaq-token-metrics` | Computes supply, circulating, user balance share, market cap, etc. for a given `userAddress`. |
| `POST` | `/insertFeesPEAQ` | Records an individual fee payout for a token/user combo. Called by the fee listener script. |
| `POST` | `/updateBlockHeightPEAQ` | Saves the last processed block height for backfills. |
| `GET` | `/getFeesPEAQ/:user_address` | Fetches all recorded fees for a specific wallet. |
| `GET` | `/getAllFeesPEAQ` | Lists every recorded fee event (ordered newest first). |
| `GET` | `/getLastBlockHeightPEAQ` | Returns the latest stored block height for the PEAQ listener. |
| `POST` | `/dsfo/mint` | Upserts DSFO mint events (token id, burner LP info, tx hash). |
| `POST` | `/dsfo/burn` | Upserts DSFO burn events and timestamps. |
| `POST` | `/dsfo/holder-balance` | Syncs DSFO NFT holder balances and tracked shares. |

All endpoints emit JSON and enable CORS for browser consumption.

## Operational Scripts
### `scripts/feesListener.js`
Long-running worker that:
- Polls FeeManager for holders and balances.
- Triggers `triggerBreakdownAndDistribution` on-chain.
- Parses `FeesDistributed` events, computes proportional payouts, and posts them to `/insertFeesPEAQ`.
- Updates `/updateBlockHeightPEAQ` for progress tracking.

Run it with:
```bash
cd scripts
npm install        # first run only
npm start          # or: node feesListener.js
```

### `scripts/purgeFees.js`
Removes PEAQ fee data (`user_fees`, `block_listener_progress`) from the configured database. Useful for resets or staging environments.
```bash
node scripts/purgeFees.js
```

## Smart Contracts & ABIs
- `contracts/FeeManager.sol` – Backend contract that distributes protocol fees per LP token.
- `contracts/DSFO_mint.sol` – NFT contract for DSFO ownership shares.
- `src/ABIs/` – JSON ABIs (Uniswap factory/pair/router, ERC‑20, DSFO, Wrapped PEAQ) consumed by viem clients across features such as Swap, Add/Remove Liquidity, Token Pairs, and Fees Dashboard.

## Linting & Formatting
```bash
npm run lint
```
The project uses ESLint with React, React Hooks, and React Refresh plugins to keep the codebase consistent.

## Troubleshooting
- **`fetch-peaq-price` returns 500** – verify `COINGECKO_API_KEY`, `SUBSCAN_API_KEY`, and outbound internet access. The server falls back to cached values if available.
- **Vite dev API calls 404** – your proxy is likely forwarding `/api` verbatim. Set `VITE_PROXY_API_PREFIX=''` or mount Express at `/api` to align the paths.
- **Fee listener exits immediately** – ensure either `MNEMONIC` or `FEE_MANAGER_OWNER_KEY` is set in `scripts/.env`.
- **`citext` missing** – enable the `citext` extension in your Postgres instance before running the schema script.
- **Wallet shows “Wrong Network”** – the custom wallet context expects chain id `3338` (PEAQ EVM). Switch MetaMask or update the RPC settings.

---

Need something else? Open an issue or reach out via the contacts linked on the home page.

