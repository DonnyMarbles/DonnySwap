import { createContext, useContext } from 'react';
import ERC20ABI from '../ABIs/ERC20ABI.json';
import UniswapV2FactoryABI from '../ABIs/UniswapV2FactoryABI.json';
import UniswapV2PairABI from '../ABIs/UniswapV2PairABI.json';
import UniswapV2Router02ABI from '../ABIs/UniswapV2Router02ABI.json';
import WrappedPEAQABI from '../ABIs/WrappedPEAQABI.json';
import DSFONFTABI from '../ABIs/DSFONFTABI.json'
export const ABIContext = createContext();

export const ABIContextProvider = ({ children }) => {
  const ABIs = {
    ERC20ABI,
    UniswapV2FactoryABI,
    UniswapV2PairABI,
    UniswapV2Router02ABI,
    WrappedPEAQABI,
    DSFONFTABI
  };

  return (
    <ABIContext.Provider value={ABIs}>
      {children}
    </ABIContext.Provider>
  );
};

export const useABI = () => {
  const context = useContext(ABIContext);
  if (!context) throw new Error('useABI must be used within ABIContextProvider');
  return context;
};
