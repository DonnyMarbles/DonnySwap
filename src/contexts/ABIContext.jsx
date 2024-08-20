import React, { createContext } from 'react';
import ERC20ABI from '../ABIs/ERC20ABI.json';
import UniswapV2FactoryABI from '../ABIs/UniswapV2FactoryABI.json';
import UniswapV2PairABI from '../ABIs/UniswapV2PairABI.json';
import UniswapV2Router02ABI from '../ABIs/UniswapV2Router02ABI.json';
import WrappedKRESTABI from '../ABIs/WrappedKRESTABI.json';

export const ABIContext = createContext();

export const ABIContextProvider = ({ children }) => {
  const ABIs = {
    ERC20ABI,
    UniswapV2FactoryABI,
    UniswapV2PairABI,
    UniswapV2Router02ABI,
    WrappedKRESTABI,
  };

  return (
    <ABIContext.Provider value={ABIs}>
      {children}
    </ABIContext.Provider>
  );
};
