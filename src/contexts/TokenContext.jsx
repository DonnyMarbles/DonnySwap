import React, { createContext, useState, useEffect } from 'react';
import tokenList from '../assets/tokenList.json';

export const TokenContext = createContext();

export const TokenContextProvider = ({ children }) => {
  const [tokens, setTokens] = useState({});

  useEffect(() => {
    setTokens(tokenList);
  }, []);

  const routerAddress = "0xf441807eD1943925f6f887660c44d7eB2EcC17C2";

  return (
    <TokenContext.Provider value={{ tokens, routerAddress }}>
      {children}
    </TokenContext.Provider>
  );
};
