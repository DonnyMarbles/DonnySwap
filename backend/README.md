## DonnySwap Backend

Node/Express service that powers DonnySwap’s advanced analytics, price feeds, and DSFO bookkeeping. It sits between the React front-end, PEAQ EVM, external market-data APIs, and PostgreSQL.

### High-Level Architecture

![High-level architecture diagram](./assets/High-level%20arch.png)

- **Express server (`server.js`)** – exposes all REST endpoints, configures CORS, and coordinates cache layers.
- **PostgreSQL** – stores fee history, DSFO NFT lifecycle data, ERC‑20 metadata, and listener progress.
- **External services** – provide token prices, supply stats, and EVM balances; results are cached to respect rate limits.

---

## Repository Layout

```
backend/
├── server.js          # Express application
├── example.env        # Sample environment variables
├── debugCoinGecko.js  # CLI helper to test CoinGecko keys
└── README.md          # This file
```

Core database schema lives in `../db_queries/remove_old_and_create_new.sql`.

---

## Requirements

- Node.js **18.20+** (matches the root project runtime).
- npm **10+** (shared with the front-end).
- PostgreSQL **14+** with `citext`.
- Network access to PEAQ RPC (`https://peaq.betterfuturelabs.xyz` by default) plus optional CoinGecko & Subscan credentials.

Install dependencies from the repo root (backend reuses the same `package.json`):

```bash
npm install
```

---

## Configuration

Copy `example.env` into `backend/.env` and fill in the blanks:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` or `PGUSER/PGPASSWORD/PGHOST/PGDATABASE/PGPORT` | PostgreSQL connection; defaults to port `25060`. |
| `PGSSL` | `'require'` (default) or `'false'` to disable SSL locally. |
| `BACKEND_URL` | Optional origin string used by automation. |
| `PEAQ_RPC_HTTP` / `PEAQ_WS_ENDPOINT` | RPC endpoints for balance checks and listener scripts. |
| `COINGECKO_API_KEY` | Optional key for Pro tier pricing. |
| `SUBSCAN_API_KEY`, `PEAQ_SUBSCAN_TOKEN_ENDPOINT`, `PEAQ_SUBSCAN_TOKEN_SYMBOL` | Configure supply stats ingestion. |
| `COINGECKO_MONTHLY_LIMIT`, `COINGECKO_USAGE_TARGET`, `SUBSCAN_DAILY_LIMIT`, `SUBSCAN_USAGE_TARGET` | Fine-tune rate-limit accounting. |
| `PEAQ_COINGECKO_ID`, `PEAQ_COINPAPRIKA_TICKER` | Override asset identifiers. |
| `PORT` | Express port (defaults to **3002**). |
| `LOG_MEMORY_USAGE`, `MEMORY_LOG_INTERVAL_MS` | Optional memory logging toggles. |

Front-end `.env` variables should point to `http://localhost:3002/api` (or whatever proxy you use) so requests reach this service.

---

## Running Locally

```bash
# from repo root
npm install          # first time
node backend/server.js
```

- Server listens on `http://localhost:3002`.
- Vite dev server (frontend) proxies `/api/*` to this backend; see `vite.config.js` for details.
- On startup the server verifies PG config and prints warnings if credentials are missing.

---

## API Surface

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/fetch-peaq-price` | Returns the most recent cached PEAQ price (Acelon SDK → CoinGecko → CoinPaprika fallback chain). |
| `POST` | `/token-prices` | Accepts `{ tokens: [{ symbol, coingeckoId }] }` and responds with `{ prices: { [coingeckoId]: usd } }`. |
| `POST` | `/peaq-token-metrics` | Calculates supply, circulating supply, burned percentage, user share, and USD values for a given `userAddress`. |
| `POST` | `/token-balances` | Accepts `{ userAddress, tokens }` (ERC‑20 metadata) and returns fully computed balance rows (supply, burned %, USD, wallet share) for the portfolio table. |
| `POST` | `/insertFeesPEAQ` | Inserts a fee payout record (called by `scripts/feesListener.js`). |
| `POST` | `/updateBlockHeightPEAQ` | Persists the latest processed block height for listener replay protection. |
| `GET` | `/getFeesPEAQ/:user_address` | Fetches fee history for a wallet. |
| `GET` | `/getAllFeesPEAQ` | Streams all recorded fee rows. |
| `GET` | `/getLastBlockHeightPEAQ` | Returns the stored block height checkpoint. |
| `POST` | `/dsfo/mint` | Upserts DSFO mint events (token id, burner LP data). |
| `POST` | `/dsfo/burn` | Upserts DSFO burn events with timestamps. |
| `POST` | `/dsfo/holder-balance` | Syncs DSFO NFT holder balances + tracked shares. |

All responses are JSON, CORS is open (`Access-Control-Allow-Origin: *`), and errors include informative messages for easier debugging.

---

## Data & Cache Flows

### PEAQ Price Resolution

![PEAQ price resolution flow](./assets/PEAQ%20Price%20Resolution.png)

- Cache TTL: **60 seconds** (`PRICE_CACHE_TTL_MS`).
- When all sources fail but a stale cache exists, the endpoint serves the cached value with a warning.

### DSFO Fee Recording Loop

![DSFO fee recording loop](./assets/DSFO%20Fee%20Recording%20Loop.png)

- `scripts/feesListener.js` calls `triggerBreakdownAndDistribution` on-chain, parses `FeesDistributed` events, and POSTs all payouts to the backend.
- UI pages consume the aggregated data to display total DEX rewards and per-holder earnings.

---

## Database Overview

Run `psql "$DATABASE_URL" -f ../db_queries/remove_old_and_create_new.sql` to create the schema. Key tables:

| Table | Purpose |
| --- | --- |
| `user_fees` | One row per holder/token/block including normalized fee amounts, raw values, and NFT snapshot counts. |
| `block_listener_progress` | Tracks the highest processed block height. |
| `erc20_tokens` | Symbol/decimals metadata for ERC‑20s seen in payouts. |
| `dsfo_mints` / `dsfo_burns` | DSFO NFT lifecycle events with LP burn context. |
| `dsfo_holder_balances` | Current NFT balances and tracked shares per holder. |
| `fee_batches` / `fee_allocations` | Batch-level metadata for each FeeManager distribution. |

All writes run through parameterized queries to avoid injection issues. Numeric columns are stored as `NUMERIC(78,0)` so very large raw amounts remain precise.

---

## Rate Limiting & Caching

- **CoinGecko** – Requests are batched (50 IDs per call). A preference ordering toggles between Free and Pro hosts; automatic retries switch hosts when error codes `10010` or `10011` suggest a different tier.
- **Subscan** – Supply stats are cached for `SUPPLY_CACHE_TTL_MS`, calculated from daily quotas.
- **Token Prices** – Each CoinGecko result is cached in-memory with TTL derived from monthly limits. Requests deduplicate concurrent fetches via `pendingTokenPricePromises`.
- **PEAQ RPC** – `eth_getBalance` results are not cached; only on-demand metrics use them.

Environment variables (`COINGECKO_MONTHLY_LIMIT`, `COINGECKO_USAGE_TARGET`, `SUBSCAN_DAILY_LIMIT`, `SUBSCAN_USAGE_TARGET`) control how aggressively the intervals are computed.

---

## Debugging & Tooling

- `node backend/debugCoinGecko.js --ids=wpeaq,usd-coin` – Sanity-check both CoinGecko hosts with your API key to confirm which tier works.
- Set `LOG_MEMORY_USAGE=true` to print RSS/heap usage periodically (helpful when running in containers).
- Enable `NODE_DEBUG=pg` (or similar) to troubleshoot DB connectivity.
- Use `curl`/Postman against `http://localhost:3002/fetch-peaq-price` etc. to verify env setup before hooking the front-end.

---

## Deployment Notes

- Keep Express behind HTTPS (via reverse proxy or platform TLS termination) and forward `/api/*` to this service.
- For production, run under a supervisor (PM2, systemd, Docker) and export the same `.env`.
- Consider persisting logs to a central system; rate-limit warnings are printed with context when external services throttle the app.
- Scale-out pattern: run multiple instances behind a load balancer sharing the same PostgreSQL. The in-memory caches are per-instance, so keep TTLs conservative if that matters for consistency.

---

## Troubleshooting

| Symptom | Likely Cause & Fix |
| --- | --- |
| `PostgreSQL configuration is incomplete` warning | Missing `DATABASE_URL` or PG credential envs. Provide either a DSN or full PG* set. |
| `/fetch-peaq-price` returns 500 | No price sources succeeded. Verify RPC connectivity, CoinGecko API key, or network egress. If cache exists, logs mention “Serving cached value.” |
| `/token-prices` responds 400 | Payload must be `{ tokens: [{ symbol, coingeckoId }] }`. Duplicate `coingeckoId`s are automatically ignored. |
| Listener script exits (`Provide MNEMONIC or FEE_MANAGER_OWNER_KEY`) | Add credentials to `scripts/.env` before running `scripts/feesListener.js`. |
| CoinGecko 429 / 4xx errors | Set `COINGECKO_API_KEY` or lower polling frequency. Use `debugCoinGecko.js` to confirm your key tier. |

Need more? Open an issue or reach out through the contact information on the main DonnySwap site.

