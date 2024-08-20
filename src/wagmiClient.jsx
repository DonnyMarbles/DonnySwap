// src/wagmiClient.js
import { createClient, configureChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';

// Example configuration for KREST EVM
const krestChain = {
  id: 2241,
  name: 'KREST EVM',
  network: 'krest',
  rpcUrls: {
    default: { http: ['https://krest.betterfuturelabs.xyz'] },
  },
  nativeCurrency: {
    name: 'KREST',
    symbol: 'KREST',
    decimals: 18,
  },
  blockExplorers: {
    default: { name: 'Subscan', url: 'https://krest.subscan.io' },
  },
};

const { chains, provider } = configureChains(
  [krestChain],
  [
    jsonRpcProvider({ rpc: (chain) => ({ http: chain.rpcUrls.default.http }) }),
    publicProvider()
  ]
);

const wagmiClient = createClient({
  autoConnect: true,
  provider,
});

export default wagmiClient;
