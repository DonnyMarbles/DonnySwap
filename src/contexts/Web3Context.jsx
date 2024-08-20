import React, { createContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const Web3Context = createContext();

export const Web3ContextProvider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [krestBalance, setKrestBalance] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (provider && account) {
      const updateKrestBalance = async () => {
        const balance = await provider.getBalance(account);
        setKrestBalance(ethers.utils.formatUnits(balance, 18));
      };

      const interval = setInterval(updateKrestBalance, 1000);
      return () => clearInterval(interval);
    }
  }, [provider, account]);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        console.log("Detected Ethereum provider:", window.ethereum);
        const tempProvider = new ethers.providers.Web3Provider(window.ethereum);
        await tempProvider.send("eth_requestAccounts", []);
        const tempSigner = tempProvider.getSigner();
        const tempAccount = await tempSigner.getAddress();
        const tempNetwork = await tempProvider.getNetwork();

        if (tempNetwork.chainId !== 2241) {
          await switchToKrestNetwork(tempProvider);
        }

        await verifyNetwork(tempProvider);

        setProvider(tempProvider);
        setSigner(tempSigner);
        setAccount(tempAccount);
      } else {
        alert("Please install MetaMask!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const switchToKrestNetwork = async (provider) => {
    try {
      await provider.send("wallet_addEthereumChain", [{
        chainId: '0x8C1',
        chainName: 'KREST EVM',
        nativeCurrency: {
          name: 'KREST',
          symbol: 'KREST',
          decimals: 18,
        },
        rpcUrls: ['https://krest.betterfuturelabs.xyz'],
        blockExplorerUrls: ['https://krest.subscan.io'],
      }]);
    } catch (switchError) {
      console.error("Error switching network:", switchError);
    }
  };

  const verifyNetwork = async (provider) => {
    try {
      const network = await provider.getNetwork();
      if (network.chainId === 2241) {
        setNetwork(network);
        console.log("Connected to KREST network with chainId:", network.chainId);
      } else {
        console.error("Failed to switch to KREST network. Current chainId:", network.chainId);
      }
    } catch (error) {
      console.error("Error verifying network:", error);
    }
  };

  const handleChainChanged = async (chainId) => {
    await verifyNetwork(provider);
    window.location.reload();
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length > 0) {
      const tempSigner = provider.getSigner();
      const tempAccount = await tempSigner.getAddress();
      setSigner(tempSigner);
      setAccount(tempAccount);
      console.log("Account changed:", tempAccount);
    } else {
      setAccount(null);
      setSigner(null);
      setProvider(null);
    }
  };

  return (
    <Web3Context.Provider value={{ provider, signer, account, network, krestBalance, setKrestBalance, connectWallet }}>
      {children}
    </Web3Context.Provider>
  );
};
