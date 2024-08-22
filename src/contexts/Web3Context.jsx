import React, { createContext, useState, useEffect } from 'react';
import Web3Modal from 'web3modal';
import { ethers } from 'ethers';

export const Web3Context = createContext();

export const Web3ContextProvider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);

  const connectWallet = async () => {
    try {
      const web3Modal = new Web3Modal();
      const instance = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(instance);
      const signer = provider.getSigner();
      const account = await signer.getAddress();
      setProvider(provider);
      setSigner(signer);
      setAccount(account);
      console.log('Wallet connected:', account);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  useEffect(() => {
    if (provider && account) {
      console.log('Wallet is connected:', account);
      // Add any additional logic needed on wallet connection
    }
  }, [provider, account]);

  return (
    <Web3Context.Provider value={{ provider, signer, account, connectWallet, setAccount, setProvider, setSigner }}>
      {children}
    </Web3Context.Provider>
  );
};
