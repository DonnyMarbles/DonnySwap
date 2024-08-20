// WalletProvider.js
import React from 'react';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { createPublicClient, http } from 'viem';

const krestChain = {
  id: 2241,
  name: 'KREST EVM',
  network: 'krest',
  iconUrl: 'https://example.com/icon.svg',
  iconBackground: '#fff',
  nativeCurrency: {
    decimals: 18,
    name: 'KREST',
    symbol: 'KRST',
  },
  rpcUrls: {
    public: { http: ['https://krest.betterfuturelabs.xyz'] },
    default: { http: ['https://krest.betterfuturelabs.xyz'] },
  },
  blockExplorers: {
    default: { name: 'KREST Explorer', url: 'https://krest.subscan.io' },
  },
};

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [krestChain],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'DonnySwap',
  chains,
});

const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

const WalletProvider = ({ children }) => {
  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={chains}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default WalletProvider;
