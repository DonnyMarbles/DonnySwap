if (typeof global === 'undefined') {
  window.global = window;
}


import React from 'react';
import ReactDOM from 'react-dom/client';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { publicProvider } from 'wagmi/providers/public';
import App from './App';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';


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
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'DonnySwap',
  chains,
});

const wagmiClient = createClient({
  autoConnect: false,
  connectors,
  provider,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <App />
      </RainbowKitProvider>
    </WagmiConfig>
  </React.StrictMode>
);
