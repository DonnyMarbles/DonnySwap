import { API_BASE_URL } from '../constants/api';

export const normalizeCoingeckoId = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const buildTokenPricePayload = (tokens = {}) => {
  const payload = [];
  const seenIds = new Set();

  Object.values(tokens).forEach((details) => {
    if (!details || !details.symbol) return;
    const normalizedId = normalizeCoingeckoId(details.extensions?.coingeckoId);
    if (!normalizedId || seenIds.has(normalizedId)) return;
    seenIds.add(normalizedId);
    payload.push({
      symbol: details.symbol,
      coingeckoId: normalizedId,
    });
  });

  return payload;
};

export const fetchTokenUsdPrices = async (tokens = {}) => {
  const payloadTokens = buildTokenPricePayload(tokens);
  if (!payloadTokens.length) return {};

  try {
    const response = await fetch(`${API_BASE_URL}/token-prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tokens: payloadTokens }),
    });

    if (!response.ok) {
      throw new Error(`Token price request failed: ${response.status}`);
    }

    const data = await response.json();
    return data?.prices || {};
  } catch (error) {
    console.error('Unable to fetch token USD prices from backend', error);
    return {};
  }
};


