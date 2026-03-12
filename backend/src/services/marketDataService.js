import axios from 'axios';
import { AcelonSdk } from '@acelon/acelon-sdk';

import {
  PRICE_CACHE_TTL_MS,
  TOKEN_PRICE_CACHE_TTL_MS,
  TOKEN_PRICE_CACHE_MAX_ENTRIES,
  COINGECKO_FREE_PRICE_URL,
  COINGECKO_PRO_PRICE_URL,
  COINGECKO_API_KEY,
  COINGECKO_ERROR_FREE_REQUIRED,
  COINGECKO_ERROR_PRO_REQUIRED,
  PRICE_REQUEST_PARAMS,
  PEAQ_PRICE_TIMEOUT_MS,
  PEAQ_COINGECKO_ID,
  PEAQ_COINPAPRIKA_TICKER,
  SHOULD_LOG_MEMORY_USAGE,
} from '../config/constants.js';
import { chunkArray } from '../utils/data.js';

const acelonSdk = new AcelonSdk({
  errorThreshold: 5,
  logging: true,
});

let cachedPeaqPrice = null;
let cachedPeaqPriceTimestamp = 0;
let inFlightPeaqPricePromise = null;
let lastResolvedPeaqPriceSource = 'acelon-sdk';

const tokenPriceCache = new Map();
const pendingTokenPricePromises = new Map();

const withTimeout = (operationPromise, timeoutMs, timeoutMessage = 'Operation timed out') => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return operationPromise;
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    Promise.resolve(operationPromise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

const buildCoinGeckoEndpoints = () => {
  const tierPreference = (process.env.COINGECKO_TIER || '').toLowerCase();
  const endpoints = [];

  const addEndpoint = (id) => {
    if (id === 'pro' && !COINGECKO_API_KEY) {
      return;
    }
    endpoints.push({
      id,
      url: id === 'pro' ? COINGECKO_PRO_PRICE_URL : COINGECKO_FREE_PRICE_URL,
    });
  };

  if (tierPreference === 'pro') {
    addEndpoint('pro');
    addEndpoint('free');
  } else if (tierPreference === 'free') {
    addEndpoint('free');
    addEndpoint('pro');
  } else if (COINGECKO_API_KEY) {
    addEndpoint('pro');
    addEndpoint('free');
  } else {
    addEndpoint('free');
    addEndpoint('pro');
  }

  return endpoints;
};

const shouldRetryCoinGecko = (errorCode, currentEndpointId) => {
  if (currentEndpointId === 'free' && errorCode === COINGECKO_ERROR_PRO_REQUIRED) {
    return true;
  }
  if (currentEndpointId === 'pro' && errorCode === COINGECKO_ERROR_FREE_REQUIRED) {
    return true;
  }
  return false;
};

const fetchCoinGeckoPrices = async (tokens = []) => {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return {};
  }
  const uniqueIds = Array.from(
    new Set(
      tokens
        .map((token) => token.coingeckoId?.toLowerCase())
        .filter((value) => typeof value === 'string' && value.length > 0)
    )
  );
  if (!uniqueIds.length) {
    return {};
  }

  const aggregated = {};
  const endpointPriority = buildCoinGeckoEndpoints();
  const batches = chunkArray(uniqueIds, 50);

  for (const batch of batches) {
    if (!endpointPriority.length) {
      console.warn('No CoinGecko endpoints available for price fetch.');
      break;
    }

    let batchFetched = false;
    for (let i = 0; i < endpointPriority.length && !batchFetched; i += 1) {
      const endpoint = endpointPriority[i];
      const params = {
        ids: batch.join(','),
        vs_currencies: 'usd',
      };
      const shouldSendHeader = endpoint.id === 'pro' && COINGECKO_API_KEY;
      const headers = shouldSendHeader
        ? {
            'x-cg-pro-api-key': COINGECKO_API_KEY,
          }
        : {};

      try {
        const response = await axios.get(endpoint.url, {
          params,
          headers,
          timeout: 10000,
        });
        const data = response.data || {};
        Object.entries(data).forEach(([coingeckoId, priceRecord]) => {
          const usdPrice = priceRecord?.usd;
          if (typeof usdPrice === 'number' && Number.isFinite(usdPrice) && usdPrice > 0) {
            aggregated[coingeckoId] = usdPrice;
          }
        });
        batchFetched = true;
      } catch (error) {
        const status = error.response?.status;
        const detail = error.response?.data;
        const errorCode = detail?.error_code;
        const canRetryElsewhere =
          shouldRetryCoinGecko(errorCode, endpoint.id) && i < endpointPriority.length - 1;
        if (canRetryElsewhere) {
          console.warn(
            `CoinGecko endpoint ${endpoint.id} suggested switching hosts (code ${errorCode}). Trying next endpoint...`
          );
          continue;
        }
        console.error(
          `CoinGecko price fetch failed on ${endpoint.id} endpoint:`,
          status ? `${status} ${error.message}` : error.message || error
        );
        if (detail) {
          console.error('CoinGecko response body:', detail);
        }
        break;
      }
    }
  }

  return aggregated;
};

const pruneTokenPriceCache = (now = Date.now()) => {
  let removed = 0;
  tokenPriceCache.forEach((entry, key) => {
    const entryTimestamp = entry?.timestamp;
    const isStale =
      typeof entryTimestamp !== 'number' || now - entryTimestamp > TOKEN_PRICE_CACHE_TTL_MS;
    if (!entry || isStale) {
      tokenPriceCache.delete(key);
      removed += 1;
    }
  });

  if (tokenPriceCache.size > TOKEN_PRICE_CACHE_MAX_ENTRIES) {
    const excess = tokenPriceCache.size - TOKEN_PRICE_CACHE_MAX_ENTRIES;
    const sortedEntries = Array.from(tokenPriceCache.entries()).sort(
      (a, b) => (a[1]?.timestamp || 0) - (b[1]?.timestamp || 0)
    );
    for (let i = 0; i < excess && i < sortedEntries.length; i += 1) {
      tokenPriceCache.delete(sortedEntries[i][0]);
      removed += 1;
    }
  }

  if (removed > 0 && SHOULD_LOG_MEMORY_USAGE) {
    console.log(
      `Token price cache pruned: removed ${removed} entries, total ${tokenPriceCache.size}`
    );
  }
};

const fetchAndCacheTokenPrices = async (tokens = []) => {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return {};
  }

  const result = {};
  let nowAfterFetch = Date.now();

  try {
    const cgPrices = await fetchCoinGeckoPrices(tokens);
    nowAfterFetch = Date.now();
    Object.entries(cgPrices).forEach(([coingeckoId, price]) => {
      if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
        result[coingeckoId] = price;
      }
    });
  } catch (error) {
    console.error('Error fetching token prices from CoinGecko:', error);
  }

  const unresolved = tokens
    .map((token) => token.coingeckoId)
    .filter((coingeckoId) => result[coingeckoId] == null);

  if (unresolved.length > 0) {
    console.warn(`CoinGecko did not return prices for: ${unresolved.join(', ')}`);
    unresolved.forEach((coingeckoId) => {
      result[coingeckoId] = 0;
    });
  }

  Object.entries(result).forEach(([coingeckoId, price]) => {
    tokenPriceCache.set(coingeckoId, { price, timestamp: nowAfterFetch });
  });

  pruneTokenPriceCache(nowAfterFetch);

  return result;
};

const normalizePriceValue = (value, sourceName) => {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`${sourceName} returned an invalid price`);
  }
  return price;
};

const fetchPeaqPriceFromAcelon = async () => {
  const response = await withTimeout(
    acelonSdk.getPrices(PRICE_REQUEST_PARAMS, 0),
    PEAQ_PRICE_TIMEOUT_MS,
    'Acelon SDK price request timed out'
  );
  if (Array.isArray(response) && response.length > 0 && response[0]?.priceData) {
    const priceData = response[0].priceData;
    const normalized = priceData.price / 10 ** priceData.decimals;
    return normalizePriceValue(normalized, 'Acelon SDK');
  }
  throw new Error('Acelon SDK price response was malformed');
};

const fetchPeaqPriceFromCoinGecko = async () => {
  const prices = await fetchCoinGeckoPrices([{ symbol: 'PEAQ', coingeckoId: PEAQ_COINGECKO_ID }]);
  const coinGeckoPrice = prices[PEAQ_COINGECKO_ID];
  return normalizePriceValue(coinGeckoPrice, 'CoinGecko');
};

const fetchPeaqPriceFromCoinPaprika = async () => {
  const response = await axios.get(
    `https://api.coinpaprika.com/v1/tickers/${PEAQ_COINPAPRIKA_TICKER}`,
    { timeout: 10000 }
  );
  const price = response?.data?.quotes?.USD?.price;
  return normalizePriceValue(price, 'CoinPaprika');
};

const peaqPriceSources = [
  { name: 'acelon-sdk', fetch: fetchPeaqPriceFromAcelon },
  { name: 'coingecko', fetch: fetchPeaqPriceFromCoinGecko },
  { name: 'coinpaprika', fetch: fetchPeaqPriceFromCoinPaprika },
];

const fetchPeaqPriceFromSources = async () => {
  const errors = [];
  for (const source of peaqPriceSources) {
    try {
      const price = await source.fetch();
      lastResolvedPeaqPriceSource = source.name;
      return price;
    } catch (error) {
      errors.push(`${source.name}: ${error.message}`);
      console.error(`PEAQ price source ${source.name} failed:`, error);
    }
  }
  throw new Error(`Unable to resolve PEAQ price (${errors.join('; ') || 'no sources tried'})`);
};

const getPeaqPrice = async (forceRefresh = false) => {
  const now = Date.now();
  const hasFreshCache =
    cachedPeaqPrice != null && now - cachedPeaqPriceTimestamp < PRICE_CACHE_TTL_MS;
  if (!forceRefresh && hasFreshCache) {
    return cachedPeaqPrice;
  }

  const shouldDeduplicate = !forceRefresh;
  if (shouldDeduplicate && inFlightPeaqPricePromise) {
    return inFlightPeaqPricePromise;
  }

  const fetchPromise = fetchPeaqPriceFromSources()
    .then((price) => {
      cachedPeaqPrice = price;
      cachedPeaqPriceTimestamp = Date.now();
      return price;
    })
    .catch((error) => {
      if (cachedPeaqPrice != null) {
        console.warn(
          `PEAQ price fetch failed${forceRefresh ? ' during force refresh' : ''}. Serving cached value.`,
          error.message
        );
        return cachedPeaqPrice;
      }
      throw error;
    });

  if (shouldDeduplicate) {
    inFlightPeaqPricePromise = fetchPromise.finally(() => {
      inFlightPeaqPricePromise = null;
    });
    return inFlightPeaqPricePromise;
  }

  return fetchPromise;
};

const resolveTokenPrices = async (tokensPayload = []) => {
  const tokens = Array.isArray(tokensPayload) ? tokensPayload : [];
  const normalized = [];
  const seenIds = new Set();

  tokens.forEach((token) => {
    const symbol = typeof token?.symbol === 'string' ? token.symbol.trim() : '';
    const coingeckoId =
      typeof token?.coingeckoId === 'string' ? token.coingeckoId.trim().toLowerCase() : '';
    if (!symbol || !coingeckoId || seenIds.has(coingeckoId)) {
      return;
    }
    seenIds.add(coingeckoId);
    normalized.push({
      symbol,
      symbolKey: symbol.toUpperCase(),
      coingeckoId,
    });
  });

  if (normalized.length === 0) {
    throw new Error('tokens array with symbol and coingeckoId is required');
  }

  const now = Date.now();
  pruneTokenPriceCache(now);
  const responsePayload = {};
  const tokensToFetch = [];
  const pendingTokens = [];

  normalized.forEach((token) => {
    const cacheEntry = tokenPriceCache.get(token.coingeckoId);
    if (cacheEntry && now - cacheEntry.timestamp < TOKEN_PRICE_CACHE_TTL_MS) {
      responsePayload[token.coingeckoId] = cacheEntry.price;
      return;
    }

    if (pendingTokenPricePromises.has(token.coingeckoId)) {
      pendingTokens.push({
        coingeckoId: token.coingeckoId,
        promise: pendingTokenPricePromises.get(token.coingeckoId),
      });
      return;
    }

    tokensToFetch.push(token);
  });

  if (pendingTokens.length > 0) {
    const settled = await Promise.all(
      pendingTokens.map(({ coingeckoId, promise }) =>
        promise
          .then((price) => ({ coingeckoId, price }))
          .catch((error) => {
            console.error(`Pending CoinGecko fetch failed for ${coingeckoId}:`, error);
            return { coingeckoId, price: 0 };
          })
      )
    );
    settled.forEach(({ coingeckoId, price }) => {
      responsePayload[coingeckoId] = price;
    });
  }

  if (tokensToFetch.length > 0) {
    const fetchPromise = fetchAndCacheTokenPrices(tokensToFetch);

    tokensToFetch.forEach((token) => {
      const perTokenPromise = fetchPromise
        .then((result) => result[token.coingeckoId])
        .catch((error) => {
          console.error(`CoinGecko fetch promise rejected for ${token.coingeckoId}:`, error);
          return 0;
        })
        .finally(() => {
          pendingTokenPricePromises.delete(token.coingeckoId);
        });
      pendingTokenPricePromises.set(token.coingeckoId, perTokenPromise);
    });

    const fetched = await fetchPromise;
    Object.entries(fetched).forEach(([coingeckoId, price]) => {
      responsePayload[coingeckoId] = price;
    });
  }

  return responsePayload;
};

const getLastResolvedPeaqPriceSource = () => lastResolvedPeaqPriceSource;

export { getPeaqPrice, resolveTokenPrices, getLastResolvedPeaqPriceSource };

