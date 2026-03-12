import { PEAQ_RPC_HTTP } from './constants.js';
import { TOKEN_BALANCES_CHAIN_ID } from './contracts.js';

const DEFAULT_CHAIN_NAME = 'PEAQ EVM';

const PEAQ_CHAIN = Object.freeze({
  id: TOKEN_BALANCES_CHAIN_ID,
  name: DEFAULT_CHAIN_NAME,
  network: 'peaq',
  nativeCurrency: {
    name: 'PEAQ',
    symbol: 'PEAQ',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [PEAQ_RPC_HTTP],
    },
  },
});

export { PEAQ_CHAIN };


