#!/usr/bin/env node
/* eslint-disable no-console */
import axios from 'axios';
import 'dotenv/config';

const COINGECKO_FREE_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price';
const COINGECKO_PRO_PRICE_URL = 'https://pro-api.coingecko.com/api/v3/simple/price';

const argMap = process.argv.slice(2).reduce((acc, arg) => {
  if (!arg.startsWith('--')) {
    acc._ = acc._ || [];
    acc._.push(arg);
    return acc;
  }
  const [rawKey, rawValue] = arg.split('=');
  const key = rawKey.replace(/^--/, '');
  acc[key] = rawValue ?? 'true';
  return acc;
}, {});

const idsInput = argMap.ids || argMap.i || (argMap._ || []).join(',') || '';
const tokenIds = idsInput
  ? idsInput
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
  : ['wpeaq', 'usd-coin', 'tether'];
const vsCurrencies = (argMap.vs || 'usd').toLowerCase();
const apiKey = process.env.COINGECKO_API_KEY || '';

const formatApiKey = () => {
  if (!apiKey) return 'none';
  if (apiKey.length <= 6) return `${apiKey[0]}***${apiKey[apiKey.length - 1]}`;
  return `${apiKey.slice(0, 3)}***${apiKey.slice(-3)} (${apiKey.length} chars)`;
};

const logSection = (title) => {
  console.log('\n======================================');
  console.log(title);
  console.log('======================================');
};

const requestPrices = async (label, endpoint) => {
  logSection(`Testing ${label} endpoint (${endpoint})`);
  const params = {
    ids: tokenIds.join(','),
    vs_currencies: vsCurrencies,
  };
  const headers = apiKey
    ? {
        'x-cg-pro-api-key': apiKey,
      }
    : {};
  const start = Date.now();
  try {
    const response = await axios.get(endpoint, {
      params,
      headers,
      timeout: 10_000,
    });
    console.log(`Status: ${response.status} (${Date.now() - start}ms)`);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    const status = error.response?.status;
    const body = error.response?.data;
    console.error(`Error status: ${status ?? 'unknown'} (${Date.now() - start}ms)`);
    console.error('Message:', error.message);
    if (body) {
      console.error('Response body:');
      console.error(JSON.stringify(body, null, 2));
    }
  }
};

const run = async () => {
  logSection('CoinGecko Debug Script');
  console.log('Token IDs:', tokenIds.join(', '));
  console.log('vs_currencies:', vsCurrencies);
  console.log('API key:', formatApiKey());

  await requestPrices('Free', COINGECKO_FREE_PRICE_URL);
  await requestPrices('Pro', COINGECKO_PRO_PRICE_URL);

  console.log('\nDone. Compare the responses above to diagnose which host works with your key.');
};

run();

