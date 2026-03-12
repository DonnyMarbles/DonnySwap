import { getAddress } from 'viem';

const DEFAULT_FACTORY_ADDRESS = '0x60659f5997C8D58DC4E4dcC1bdB89E8f62Be40E6';
const DEFAULT_WRAPPED_PEAQ_ADDRESS = '0x3cD66d2e1fac1751B0A20BeBF6cA4c9699Bb12d7';
const TOKEN_BALANCES_CHAIN_ID = 3338;

const normalizeAddress = (value, fallback) => {
  try {
    return getAddress(value || fallback);
  } catch {
    return getAddress(fallback);
  }
};

const FACTORY_ADDRESS = normalizeAddress(
  process.env.UNISWAP_FACTORY_ADDRESS,
  DEFAULT_FACTORY_ADDRESS,
);

const WRAPPED_PEAQ_ADDRESS = normalizeAddress(
  process.env.WRAPPED_PEAQ_ADDRESS,
  DEFAULT_WRAPPED_PEAQ_ADDRESS,
);

export { FACTORY_ADDRESS, WRAPPED_PEAQ_ADDRESS, TOKEN_BALANCES_CHAIN_ID };


