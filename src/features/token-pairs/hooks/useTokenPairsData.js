import { useEffect, useRef, useState } from 'react';
import { formatUnits, getAddress } from 'viem';

import { safeParseUnits, safeFormatUnits } from '../../../lib/tokenMath';
import { NULL_ADDRESS } from '../constants';
import { FACTORY_ADDRESS, WRAPPED_PEAQ_ADDRESS } from '../../../constants/contracts';

const useTokenPairsData = ({ publicClient, tokens, abis, account, PEAQPrice, blockNumber }) => {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const { UniswapV2PairABI, UniswapV2FactoryABI } = abis || {};

  useEffect(() => {
    let cancelled = false;

    const fetchPairs = async () => {
    if (!publicClient || !UniswapV2PairABI || !UniswapV2FactoryABI) {
      setPairs([]);
      setLoading(false);
      return;
    }

    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    try {
      const pairCountRaw = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: UniswapV2FactoryABI,
        functionName: 'allPairsLength',
      });
      const pairCount = Number(pairCountRaw);
      const pairsData = [];

      for (let i = 0; i < pairCount; i += 1) {
        const pairAddress = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: UniswapV2FactoryABI,
          functionName: 'allPairs',
          args: [BigInt(i)],
        });

        const pairContract = { address: pairAddress, abi: UniswapV2PairABI };

        const tokenAAddress = getAddress(
          await publicClient.readContract({
            ...pairContract,
            functionName: 'token0',
          }),
        );
        const tokenBAddress = getAddress(
          await publicClient.readContract({
            ...pairContract,
            functionName: 'token1',
          }),
        );

        const tokenSymbolA =
          tokenAAddress.toLowerCase() === WRAPPED_PEAQ_ADDRESS.toLowerCase()
            ? 'PEAQ'
            : tokens[tokenAAddress]?.symbol;
        const tokenSymbolB =
          tokenBAddress.toLowerCase() === WRAPPED_PEAQ_ADDRESS.toLowerCase()
            ? 'PEAQ'
            : tokens[tokenBAddress]?.symbol;

        if (
          !tokenSymbolA ||
          !tokenSymbolB ||
          tokenSymbolA === tokenSymbolB ||
          (tokenSymbolA === 'PEAQ' && tokenSymbolB === 'WPEAQ') ||
          (tokenSymbolA === 'WPEAQ' && tokenSymbolB === 'PEAQ')
        ) {
          continue;
        }

        const tokenALogo = tokens[tokenAAddress]?.logo || '';
        const tokenBLogo = tokens[tokenBAddress]?.logo || '';

        const [reserve0, reserve1] = await publicClient.readContract({
          ...pairContract,
          functionName: 'getReserves',
        });
        const totalSupply = await publicClient.readContract({
          ...pairContract,
          functionName: 'totalSupply',
        });
        const userBalance = account
          ? await publicClient.readContract({
              ...pairContract,
              functionName: 'balanceOf',
              args: [account],
            })
          : 0n;
        const burnedBalance = await publicClient.readContract({
          ...pairContract,
          functionName: 'balanceOf',
          args: [NULL_ADDRESS],
        });

        const totalSupplyFloat = Number(formatUnits(totalSupply, 18));
        const burnedPercentage =
          totalSupplyFloat === 0
            ? 0
            : (Number(formatUnits(burnedBalance, 18)) / totalSupplyFloat) * 100;
        const userShare =
          totalSupplyFloat === 0
            ? 0
            : (Number(formatUnits(userBalance, 18)) / totalSupplyFloat) * 100;

        let totalSupplyUSD = '0.00';
        let userBalanceUSD = '0.00';

        if (PEAQPrice) {
          let priceOfTokenAInWPEAQ = 0;
          let priceOfTokenBInWPEAQ = 0;

          if (tokenSymbolA !== 'WPEAQ') {
            priceOfTokenAInWPEAQ =
              parseFloat(formatUnits(reserve1, 18)) /
              parseFloat(formatUnits(reserve0, tokens[tokenAAddress]?.decimals || 18));
          }

          if (tokenSymbolB !== 'WPEAQ') {
            priceOfTokenBInWPEAQ =
              parseFloat(formatUnits(reserve0, 18)) /
              parseFloat(formatUnits(reserve1, tokens[tokenBAddress]?.decimals || 18));
          }

          const priceInWPEAQ =
            (priceOfTokenAInWPEAQ > 0 ? priceOfTokenAInWPEAQ : 1) *
            (priceOfTokenBInWPEAQ > 0 ? priceOfTokenBInWPEAQ : 1);

          if (!Number.isNaN(priceInWPEAQ) && Number.isFinite(priceInWPEAQ) && priceInWPEAQ > 0) {
            const priceInUSD = priceInWPEAQ * PEAQPrice;
            const priceInUSDUnits = safeParseUnits(priceInUSD.toString(), 18);
            const totalSupplyUsdRaw = (priceInUSDUnits * totalSupply) / (10n ** 18n);
            const userBalanceUsdRaw = (priceInUSDUnits * userBalance) / (10n ** 18n);

            totalSupplyUSD = parseFloat(safeFormatUnits(totalSupplyUsdRaw, 18)).toFixed(2);
            userBalanceUSD = parseFloat(safeFormatUnits(userBalanceUsdRaw, 18)).toFixed(2);
          }
        }

        pairsData.push({
          tokenASymbol: tokenSymbolA,
          tokenBSymbol: tokenSymbolB,
          tokenALogo,
          tokenBLogo,
          reserves: [reserve0, reserve1],
          totalSupply,
          userBalance,
          userShare,
          pairAddress,
          tokenAAddress,
          tokenBAddress,
          burnedBalance,
          burnedPercentage,
          totalSupplyUSD,
          userBalanceUSD,
          tokenADecimals: tokens[tokenAAddress]?.decimals || 18,
          tokenBDecimals: tokens[tokenBAddress]?.decimals || 18,
        });
      }

      if (!cancelled) setPairs(pairsData);
    } catch (error) {
      if (!cancelled) console.error('Error fetching pairs:', error);
    } finally {
      hasLoadedOnceRef.current = true;
      if (!cancelled) setLoading(false);
    }
    };

    fetchPairs();

    return () => {
      cancelled = true;
    };
  }, [publicClient, UniswapV2PairABI, UniswapV2FactoryABI, account, PEAQPrice, tokens, blockNumber]);

  return { pairs, loading };
};

export default useTokenPairsData;

