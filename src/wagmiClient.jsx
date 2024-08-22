import { createClient, configureChains, WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

// Define your custom chain
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

// Configure chains
const { chains, provider } = configureChains(
  [krestChain],
  [
    jsonRpcProvider({ rpc: (chain) => ({ http: chain.rpcUrls.default.http }) }),
    publicProvider()
  ]
);

// Initialize Web3Modal
const web3Modal = new Web3Modal({
  cacheProvider: true, // optional
  providerOptions: {} // required
});

// Create wagmi client
const wagmiClient = createClient({
  autoConnect: true,
  provider,
});

export { web3Modal, wagmiClient, chains };
