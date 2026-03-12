import axios from 'axios';

import {
  SUBSCAN_TOKEN_ENDPOINT,
  SUBSCAN_TOKEN_SYMBOL,
  SUBSCAN_API_KEY,
  SUBSCAN_REQUEST_TIMEOUT_MS,
  SUPPLY_CACHE_TTL_MS,
} from '../config/constants.js';

let cachedSupplyStats = null;
let cachedSupplyTimestamp = 0;
let supplyFetchPromise = null;

const fetchSubscanSupplyStats = async () => {
  try {
    const response = await axios.post(
      SUBSCAN_TOKEN_ENDPOINT,
      { token: SUBSCAN_TOKEN_SYMBOL },
      {
        headers: SUBSCAN_API_KEY
          ? {
              'Content-Type': 'application/json',
              'X-API-Key': SUBSCAN_API_KEY,
            }
          : {
              'Content-Type': 'application/json',
            },
        timeout: SUBSCAN_REQUEST_TIMEOUT_MS,
      }
    );

    const payload = response.data;
    if (!payload || payload.code !== 0) {
      throw new Error(payload?.message || 'Subscan returned a non-success response');
    }

    const tokenDetail =
      payload?.data?.detail?.[SUBSCAN_TOKEN_SYMBOL] ||
      payload?.data?.detail?.[SUBSCAN_TOKEN_SYMBOL.toUpperCase()];
    if (!tokenDetail) {
      throw new Error(`Token ${SUBSCAN_TOKEN_SYMBOL} not found in Subscan response`);
    }

    const totalIssuanceStr = tokenDetail.total_issuance;
    const circulatingStr =
      tokenDetail.circulating_supply ??
      tokenDetail.available_balance ??
      tokenDetail.free_balance;

    if (!totalIssuanceStr || !circulatingStr) {
      throw new Error('Subscan token response missing supply fields');
    }

    return {
      totalIssuance: BigInt(totalIssuanceStr),
      circulatingSupply: BigInt(circulatingStr),
    };
  } catch (error) {
    const detail = error?.response?.data;
    console.error('Failed to fetch supply stats from Subscan:', detail || error);
    throw error;
  }
};

const getSupplyStats = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && cachedSupplyStats && now - cachedSupplyTimestamp < SUPPLY_CACHE_TTL_MS) {
    return cachedSupplyStats;
  }

  if (!forceRefresh && supplyFetchPromise) {
    return supplyFetchPromise;
  }

  const fetchPromise = fetchSubscanSupplyStats()
    .then((stats) => {
      cachedSupplyStats = stats;
      cachedSupplyTimestamp = Date.now();
      return stats;
    })
    .finally(() => {
      supplyFetchPromise = null;
    });

  if (!forceRefresh) {
    supplyFetchPromise = fetchPromise;
  }

  return fetchPromise;
};

export { getSupplyStats };

