import { Router } from 'express';

import { setCorsHeaders } from '../utils/http.js';
import {
  getPeaqPrice,
  resolveTokenPrices,
  getLastResolvedPeaqPriceSource,
} from '../services/marketDataService.js';
import { buildPeaqMetrics } from '../services/peaqMetricsService.js';

const router = Router();

router.get('/fetch-peaq-price', async (req, res) => {
  setCorsHeaders(res);
  try {
    const price = await getPeaqPrice();
    console.log(`Fetched PEAQ price (${getLastResolvedPeaqPriceSource()}):`, price);
    res.status(200).json({ price });
  } catch (error) {
    console.error('Error fetching PEAQ price:', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to fetch PEAQ price' });
  }
});

router.post('/token-prices', async (req, res) => {
  setCorsHeaders(res);
  try {
    const prices = await resolveTokenPrices(req.body?.tokens);
    return res.status(200).json({ prices });
  } catch (error) {
    console.error('Error resolving token prices:', error);
    const status = error.message?.includes('required') ? 400 : 500;
    return res.status(status).json({ error: error.message || 'Failed to fetch token prices' });
  }
});

router.post('/peaq-token-metrics', async (req, res) => {
  setCorsHeaders(res);
  const { userAddress, burnedTokens, peaqPrice } = req.body || {};
  if (!userAddress || typeof userAddress !== 'string') {
    return res.status(400).json({ error: 'userAddress is required' });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(userAddress)) {
    return res.status(400).json({ error: 'Invalid userAddress' });
  }

  let burnedValue = 0n;
  try {
    if (burnedTokens !== undefined && burnedTokens !== null) {
      burnedValue = BigInt(burnedTokens);
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid burnedTokens value' });
  }

  let priceOverride = null;
  if (peaqPrice !== undefined && peaqPrice !== null) {
    const parsedPrice = Number(peaqPrice);
    if (!Number.isNaN(parsedPrice)) {
      priceOverride = parsedPrice;
    }
  }

  try {
    const metrics = await buildPeaqMetrics({
      userAddress,
      burnedTokens: burnedValue,
      peaqPriceOverride: priceOverride,
    });
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error computing PEAQ metrics:', error);
    res.status(500).json({ error: 'Failed to compute PEAQ metrics' });
  }
});

export default router;

