import { createContext, useContext, useState, useEffect } from 'react';
import { getAddress } from 'viem';
import { useWallet } from './WalletContext';
import { useABI } from './ABIContext';
import { FACTORY_ADDRESS } from '../constants/contracts';

export const TokenPairsContext = createContext();

export const TokenPairsProvider = ({ children }) => {
  const { publicClient } = useWallet();
  const { UniswapV2FactoryABI, UniswapV2PairABI } = useABI();
  const [tokenPairs, setTokenPairs] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!publicClient || !UniswapV2FactoryABI || !UniswapV2PairABI) return undefined;
    let cancelled = false;

    const fetchPairsFromFactory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const totalPairsRaw = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: UniswapV2FactoryABI,
          functionName: 'allPairsLength',
        });
        const totalPairs = Number(totalPairsRaw);

        if (!Number.isFinite(totalPairs) || totalPairs === 0) {
          if (!cancelled) setTokenPairs({});
          return;
        }

        const pairIndexes = Array.from({ length: totalPairs }, (_, index) => BigInt(index));
        const pairAddresses = await Promise.all(
          pairIndexes.map((pairIndex) =>
            publicClient.readContract({
              address: FACTORY_ADDRESS,
              abi: UniswapV2FactoryABI,
              functionName: 'allPairs',
              args: [pairIndex],
            })
          )
        );

        const pairEntries = await Promise.all(
          pairAddresses.map(async (addressLike) => {
            const pairAddress = getAddress(addressLike);
            const [token0Address, token1Address] = await Promise.all([
              publicClient.readContract({
                address: pairAddress,
                abi: UniswapV2PairABI,
                functionName: 'token0',
              }),
              publicClient.readContract({
                address: pairAddress,
                abi: UniswapV2PairABI,
                functionName: 'token1',
              }),
            ]);

            return [
              pairAddress,
              {
                address: pairAddress,
                token1_address: getAddress(token0Address),
                token2_address: getAddress(token1Address),
              },
            ];
          })
        );

        if (!cancelled) {
          setTokenPairs(Object.fromEntries(pairEntries));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Unable to fetch token pairs from factory', err);
          setError(err.message || 'Unable to fetch token pairs');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPairsFromFactory();
    const intervalId = setInterval(fetchPairsFromFactory, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [publicClient, UniswapV2FactoryABI, UniswapV2PairABI]);

  return (
    <TokenPairsContext.Provider value={{ tokenPairs, isLoading, error }}>
      {children}
    </TokenPairsContext.Provider>
  );
};

export const useTokenPairsCtx = () => {
  const context = useContext(TokenPairsContext);
  if (!context) throw new Error('useTokenPairsCtx must be used within TokenPairsProvider');
  return context;
};
