import { createContext, useContext, useState, useEffect } from 'react';
import { getAddress, isAddress } from 'viem';
import tokenList from '../assets/tokenList.js';

const TOKEN_LIST_URL = 'https://ipfs.peaq.xyz/ipfs/QmbiKyCeQiBaRX5wTw4c4GbMa1HhKFmUEz71qMRa2duFf5';
const TARGET_CHAIN_ID = 3338;
const PEAQ_PRECOMPILE_ADDRESS = getAddress('0x0000000000000000000000000000000000000809');

const normalizeCustomTokenList = (tokensRecord = {}) =>
  Object.entries(tokensRecord).reduce((acc, [key, tokenDetails]) => {
    if (!isAddress(key)) {
      acc[key] = tokenDetails;
      return acc;
    }

    try {
      const checksumAddress = getAddress(key);
      acc[checksumAddress] = {
        ...tokenDetails,
        address: checksumAddress,
        name: tokenDetails.name ?? tokenDetails.symbol,
      };
    } catch {
      acc[key] = tokenDetails;
    }

    return acc;
  }, {});

const normalizeRemoteTokenList = (tokenArray = []) =>
  tokenArray.reduce((acc, tokenDetails) => {
    if (!tokenDetails) return acc;
    if (tokenDetails.chainId !== TARGET_CHAIN_ID) return acc;
    if (!tokenDetails.address || !isAddress(tokenDetails.address)) return acc;

    const checksumAddress = getAddress(tokenDetails.address);
    if (checksumAddress === PEAQ_PRECOMPILE_ADDRESS) return acc;
    acc[checksumAddress] = {
      symbol: tokenDetails.symbol,
      name: tokenDetails.name ?? tokenDetails.symbol,
      address: checksumAddress,
      decimals: tokenDetails.decimals ?? 18,
      logo: tokenDetails.logoURI || '',
      tags: tokenDetails.tags,
      extensions: tokenDetails.extensions,
    };

    return acc;
  }, {});

const CUSTOM_TOKENS = normalizeCustomTokenList(tokenList);

export const TokenContext = createContext();

export const TokenContextProvider = ({ children }) => {
  const [tokens, setTokens] = useState(CUSTOM_TOKENS);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchTokenList = async () => {
      try {
        const response = await fetch(TOKEN_LIST_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch peaq token list: ${response.status}`);
        }

        const data = await response.json();
        const remoteTokens = normalizeRemoteTokenList(data?.tokens);
        if (!isMounted) return;

        setTokens((prevTokens) => ({
          ...prevTokens,
          ...remoteTokens,
          
        }));
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Unable to load peaq token list', error);
      }
    };

    fetchTokenList();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const routerAddress = "0xBa6777062F71318de6b681370189055904e20D21";

  return (
    <TokenContext.Provider value={{ tokens, routerAddress }}>
      {children}
    </TokenContext.Provider>
  );
};

export const useTokens = () => {
  const context = useContext(TokenContext);
  if (!context) throw new Error('useTokens must be used within TokenContextProvider');
  return context;
};
