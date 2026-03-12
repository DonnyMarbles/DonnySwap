const SERVER_PORT = Number(process.env.PORT) || 3002;

const PEAQ_RPC_HTTP = process.env.PEAQ_RPC_HTTP || 'https://peaq.betterfuturelabs.xyz';
const SUBSCAN_TOKEN_ENDPOINT =
  process.env.PEAQ_SUBSCAN_TOKEN_ENDPOINT || 'https://peaq.api.subscan.io/api/scan/token';
const SUBSCAN_TOKEN_SYMBOL = (process.env.PEAQ_SUBSCAN_TOKEN_SYMBOL || 'PEAQ').toUpperCase();
const SUBSCAN_API_KEY = process.env.PEAQ_SUBSCAN_API_KEY || process.env.SUBSCAN_API_KEY || '';
const SUBSCAN_REQUEST_TIMEOUT_MS = Number(process.env.SUBSCAN_REQUEST_TIMEOUT_MS) || 15000;

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;
const DEFAULT_DAYS_IN_MONTH = 30;

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const computeRateLimitedInterval = (periodMs, allowedCalls) => {
  if (!Number.isFinite(allowedCalls) || allowedCalls <= 0) {
    return periodMs;
  }
  return Math.max(MS_IN_SECOND, Math.ceil(periodMs / allowedCalls));
};

const COINGECKO_MONTHLY_LIMIT = Number(process.env.COINGECKO_MONTHLY_LIMIT) || 10000;
const COINGECKO_USAGE_TARGET =
  Number(process.env.COINGECKO_USAGE_TARGET) > 0 ? Number(process.env.COINGECKO_USAGE_TARGET) : 0.9;
const SUBSCAN_DAILY_LIMIT = Number(process.env.SUBSCAN_DAILY_LIMIT) || 100000;
const SUBSCAN_USAGE_TARGET =
  Number(process.env.SUBSCAN_USAGE_TARGET) > 0 ? Number(process.env.SUBSCAN_USAGE_TARGET) : 0.9;

const targetCoingeckoCalls = Math.max(
  1,
  Math.floor(COINGECKO_MONTHLY_LIMIT * COINGECKO_USAGE_TARGET)
);
const targetSubscanCalls = Math.max(1, Math.floor(SUBSCAN_DAILY_LIMIT * SUBSCAN_USAGE_TARGET));

const SUPPLY_CACHE_TTL_MS = computeRateLimitedInterval(MS_IN_DAY, targetSubscanCalls);
const PRICE_CACHE_TTL_MS = MS_IN_MINUTE;
const TOKEN_PRICE_CACHE_TTL_MS = computeRateLimitedInterval(
  DEFAULT_DAYS_IN_MONTH * MS_IN_DAY,
  targetCoingeckoCalls
);

const COINGECKO_FREE_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price';
const COINGECKO_PRO_PRICE_URL = 'https://pro-api.coingecko.com/api/v3/simple/price';
const COINGECKO_ERROR_PRO_REQUIRED = 10010;
const COINGECKO_ERROR_FREE_REQUIRED = 10011;

const PRICE_REQUEST_PARAMS = {
  pairs: [
    {
      from: 'PEAQ',
      to: 'USDT',
      decimals: 8,
    },
  ],
  protocol: 'EVM',
  aggregation: ['median'],
  maxValidationDiff: 0.05,
};

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
const PEAQ_COINGECKO_ID = (process.env.PEAQ_COINGECKO_ID || 'peaq-network').toLowerCase();
const PEAQ_COINPAPRIKA_TICKER =
  (process.env.PEAQ_COINPAPRIKA_TICKER || 'peaq-peaq-network').toLowerCase();
const PEAQ_PRICE_TIMEOUT_MS = toPositiveNumber(process.env.PEAQ_PRICE_TIMEOUT_MS, 8000);
const TOKEN_PRICE_CACHE_MAX_ENTRIES = toPositiveInteger(
  process.env.TOKEN_PRICE_CACHE_MAX_ENTRIES,
  1000
);

const SHOULD_LOG_MEMORY_USAGE = (process.env.LOG_MEMORY_USAGE || '').toLowerCase() === 'true';
const MEMORY_LOG_INTERVAL_MS = toPositiveNumber(process.env.MEMORY_LOG_INTERVAL_MS, MS_IN_MINUTE);
const BYTES_PER_MB = 1024 * 1024;

const DEFAULT_PG_PORT = process.env.PGPORT ? Number(process.env.PGPORT) : 25060;
const SHOULD_DISABLE_SSL = (process.env.PGSSL || '').toLowerCase() === 'false';
const CHAIN_PEAQ = 'PEAQ';

export {
  SERVER_PORT,
  PEAQ_RPC_HTTP,
  SUBSCAN_TOKEN_ENDPOINT,
  SUBSCAN_TOKEN_SYMBOL,
  SUBSCAN_API_KEY,
  SUBSCAN_REQUEST_TIMEOUT_MS,
  SUPPLY_CACHE_TTL_MS,
  PRICE_CACHE_TTL_MS,
  TOKEN_PRICE_CACHE_TTL_MS,
  COINGECKO_FREE_PRICE_URL,
  COINGECKO_PRO_PRICE_URL,
  COINGECKO_ERROR_PRO_REQUIRED,
  COINGECKO_ERROR_FREE_REQUIRED,
  PRICE_REQUEST_PARAMS,
  COINGECKO_API_KEY,
  PEAQ_COINGECKO_ID,
  PEAQ_COINPAPRIKA_TICKER,
  PEAQ_PRICE_TIMEOUT_MS,
  TOKEN_PRICE_CACHE_MAX_ENTRIES,
  SHOULD_LOG_MEMORY_USAGE,
  MEMORY_LOG_INTERVAL_MS,
  BYTES_PER_MB,
  DEFAULT_PG_PORT,
  SHOULD_DISABLE_SSL,
  CHAIN_PEAQ,
};

