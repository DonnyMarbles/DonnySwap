import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPublicClient, createWalletClient, custom, getAddress, http } from 'viem';

export const PEAQ_CHAIN = {
  id: 3338,
  name: 'PEAQ EVM',
  network: 'peaq',
  rpcUrls: {
    default: { http: ['https://peaq.betterfuturelabs.xyz'] },
  },
  nativeCurrency: {
    name: 'PEAQ',
    symbol: 'PEAQ',
    decimals: 18,
  },
  blockExplorers: {
    default: { name: 'Subscan', url: 'https://peaq.subscan.io' },
  },
};

const WalletContext = createContext(null);
const RPC_URL = PEAQ_CHAIN.rpcUrls.default.http[0];

const normalizeChainId = (value) => {
  if (!value) return PEAQ_CHAIN.id;
  if (typeof value === 'number') return value;
  return parseInt(value, 16);
};

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(PEAQ_CHAIN.id);
  const [walletClient, setWalletClient] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: PEAQ_CHAIN,
        transport: http(RPC_URL),
      }),
    []
  );

  const setWalletDisconnected = useCallback(() => {
    setAddress(null);
    setWalletClient(null);
    setChainId(PEAQ_CHAIN.id);
  }, []);

  const syncFromAddresses = useCallback(
    async (accounts) => {
      if (!accounts || accounts.length === 0) {
        setWalletDisconnected();
        return;
      }

      try {
        const [primary] = accounts;
        const normalized = primary ? getAddress(primary) : null;
        setAddress(normalized);

        if (typeof window === 'undefined' || !window.ethereum) return;

        const client = createWalletClient({
          chain: PEAQ_CHAIN,
          transport: custom(window.ethereum),
        });
        setWalletClient(client);
      } catch (error) {
        console.error('Failed to sync wallet state', error);
        setWalletDisconnected();
      }
    },
    [setWalletDisconnected]
  );

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No injected wallet found');
    }
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await syncFromAddresses(accounts);
      const nextChainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(normalizeChainId(nextChainId));
    } finally {
      setIsConnecting(false);
    }
  }, [syncFromAddresses]);

  const disconnect = useCallback(() => {
    setWalletDisconnected();
  }, [setWalletDisconnected]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return undefined;
    }

    const handleAccountsChanged = (accounts) => {
      syncFromAddresses(accounts);
    };

    const handleChainChanged = (nextChainId) => {
      setChainId(normalizeChainId(nextChainId));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    window.ethereum
      .request({ method: 'eth_accounts' })
      .then(syncFromAddresses)
      .catch(() => setWalletDisconnected());

    window.ethereum
      .request({ method: 'eth_chainId' })
      .then((nextChainId) => setChainId(normalizeChainId(nextChainId)))
      .catch(() => setChainId(PEAQ_CHAIN.id));

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [syncFromAddresses, setWalletDisconnected]);

  const chain = useMemo(
    () => ({
      ...PEAQ_CHAIN,
      id: chainId,
    }),
    [chainId]
  );

  const value = useMemo(
    () => ({
      address,
      chainId,
      chain,
      walletClient,
      publicClient,
      isConnected: Boolean(address),
      isConnecting,
      connect,
      disconnect,
    }),
    [address, chainId, chain, walletClient, publicClient, isConnecting, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

