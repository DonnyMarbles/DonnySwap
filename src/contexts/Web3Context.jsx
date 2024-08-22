import React, { createContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const Web3Context = createContext();

export const Web3ContextProvider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null); // This is the account state
  const [network, setNetwork] = useState(null);
  const [krestBalance, setKrestBalance] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      connectWallet(); // Attempt to connect wallet on load
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

      updateKrestBalance();
      const interval = setInterval(updateKrestBalance, 1000);
      return () => clearInterval(interval);
    }
  }, [provider, account]);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);

        const web3Signer = web3Provider.getSigner();
        setSigner(web3Signer);

        const userAccount = await web3Signer.getAddress();
        setAccount(userAccount); // Set the account state here

        const userNetwork = await web3Provider.getNetwork();
        setNetwork(userNetwork);
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  };

  const handleChainChanged = (chainId) => {
    window.location.reload();
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]); // Update account state when account changes
    } else {
      setAccount(null);
      setSigner(null);
      setKrestBalance(null);
    }
  };

  return (
    <Web3Context.Provider value={{ provider, setAccount, signer, account, network, krestBalance }}>
      {children}
    </Web3Context.Provider>
  );
};
