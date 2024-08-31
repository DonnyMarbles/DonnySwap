import React, { createContext, useState, useEffect } from 'react';
import tokenPairsList from '../assets/tokenPairsList.json';

export const TokenPairsContext = createContext();

export const TokenPairsProvider = ({ children }) => {
  const [tokenPairs, setTokenPairs] = useState({});

  useEffect(() => {
    setTokenPairs(tokenPairsList);
  }, []);

  return (
    <TokenPairsContext.Provider value={{ tokenPairs }}>
      {children}
    </TokenPairsContext.Provider>
  );
};
